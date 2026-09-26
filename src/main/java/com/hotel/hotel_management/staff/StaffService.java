package com.hotel.hotel_management.staff;

import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class StaffService {

    private final StaffRepository staffRepository;
    private final UserRepository userRepository;
    private volatile long lastSyncTimestamp = 0L;
    private static final long SYNC_INTERVAL_MS = 60 * 1000L; // Sync at most once every 60 seconds

    /**
     * Guards the backfill so only one caller runs it at a time. The old code
     * used `synchronized`, which made every *other* caller block on the
     * monitor for the whole duration — and it held that monitor across several
     * Firestore round trips. A caller that loses this race returns the current
     * list immediately instead of queueing.
     */
    private final java.util.concurrent.atomic.AtomicBoolean backfillRunning =
            new java.util.concurrent.atomic.AtomicBoolean(false);

    public StaffService(StaffRepository staffRepository, UserRepository userRepository) {
        this.staffRepository = staffRepository;
        this.userRepository = userRepository;
    }

    public Staff createStaff(CreateStaffRequest request) {
        if (request.userUid() == null || request.userUid().trim().isEmpty()) {
            throw new IllegalArgumentException("User UID is required");
        }

        User user = userRepository.findByUid(request.userUid())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (Role.CUSTOMER.name().equalsIgnoreCase(user.getRole())) {
            throw new IllegalArgumentException("User must have a staff role");
        }

        if (staffRepository.findByUserUid(request.userUid()).isPresent()) {
            throw new IllegalArgumentException("User is already linked to a staff profile");
        }

        if (request.employeeId() == null || request.employeeId().trim().isEmpty()) {
            throw new IllegalArgumentException("Employee ID is required");
        }

        if (staffRepository.findByEmployeeId(request.employeeId()).isPresent()) {
            throw new IllegalArgumentException("Employee ID is already in use");
        }

        if (request.department() == null) {
            throw new IllegalArgumentException("Department is required");
        }

        if (request.position() == null || request.position().trim().isEmpty()) {
            throw new IllegalArgumentException("Position is required");
        }

        if (request.salary() != null && request.salary() < 0) {
            throw new IllegalArgumentException("Salary cannot be negative");
        }

        if (request.hireDate() == null) {
            throw new IllegalArgumentException("Hire date is required");
        }

        Instant now = Instant.now();

        Staff staff = new Staff();
        staff.setStaffId(UUID.randomUUID().toString());
        staff.setUserUid(request.userUid());
        staff.setEmployeeId(request.employeeId());
        staff.setDepartment(request.department());
        staff.setPosition(request.position());
        staff.setHireDate(request.hireDate());
        staff.setSalary(request.salary());
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        staff.setEmergencyContact(request.emergencyContact());
        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);

        return staffRepository.save(staff);
    }

    public Staff updateStaff(String staffId, UpdateStaffRequest request) {
        Staff existing = getStaffById(staffId);

        if (request.employeeId() != null && !request.employeeId().trim().isEmpty()) {
            if (!request.employeeId().equals(existing.getEmployeeId())) {
                var duplicate = staffRepository.findByEmployeeId(request.employeeId());
                if (duplicate.isPresent() && !duplicate.get().getStaffId().equals(staffId)) {
                    throw new IllegalArgumentException("Employee ID is already in use");
                }
            }
        }

        if (request.position() != null && request.position().trim().isEmpty()) {
            throw new IllegalArgumentException("Position cannot be empty");
        }

        if (request.salary() != null && request.salary() < 0) {
            throw new IllegalArgumentException("Salary cannot be negative");
        }

        return staffRepository.update(staffId, request);
    }

    public Staff updateStatus(String staffId, EmploymentStatus status) {
        getStaffById(staffId);

        if (status == null) {
            throw new IllegalArgumentException("Employment status is required");
        }

        return staffRepository.updateStatus(staffId, status);
    }

    public Staff getStaffById(String staffId) {
        return staffRepository.findById(staffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff member not found"));
    }

    public Staff getStaffByUserUid(String userUid) {
        return staffRepository.findByUserUid(userUid)
                .orElseGet(() -> {
                    User user = userRepository.findByUid(userUid)
                            .orElseThrow(() -> new IllegalArgumentException("Staff member not found for user"));
                    if (Role.CUSTOMER.name().equalsIgnoreCase(user.getRole())) {
                        throw new IllegalArgumentException("Staff member not found for user");
                    }
                    Staff created = createDefaultStaffForUser(user);
                    if (created == null) {
                        throw new IllegalArgumentException("Staff member not found for user");
                    }
                    return created;
                });
    }

    public List<Staff> getAllStaff() {
        return syncStaffProfilesFromUsers();
    }

    public List<Staff> getStaff(StaffDepartment department, EmploymentStatus status) {
        List<Staff> staffList = syncStaffProfilesFromUsers();

        if (department != null) {
            staffList = staffList.stream()
                    .filter(s -> s.getDepartment() == department)
                    .toList();
        }

        if (status != null) {
            staffList = staffList.stream()
                    .filter(s -> s.getEmploymentStatus() == status)
                    .toList();
        }

        return staffList;
    }

    public void invalidateSyncCache() {
        lastSyncTimestamp = 0L;
        staffRepository.clearCache();
    }

    /**
     * Backfills a Staff record for any staff-role user who lacks one.
     *
     * The backfill stays on the calling request rather than moving to a
     * background thread: the response is expected to contain the profiles it
     * creates, so returning early would hand the caller an incomplete list and
     * a second refresh to see their own new colleague.
     *
     * What changed is *who* runs it. It used to be `synchronized`, so a cache
     * miss meant the caller waited for a full-collection read plus one write
     * per missing user, and every other caller with a staff list open queued
     * behind the same monitor. Only one caller still runs it, but the rest
     * return the current list immediately.
     */
    private List<Staff> syncStaffProfilesFromUsers() {
        long now = System.currentTimeMillis();

        if (now - lastSyncTimestamp >= SYNC_INTERVAL_MS
                && backfillRunning.compareAndSet(false, true)) {
            lastSyncTimestamp = now;
            try {
                return backfillMissingStaffProfiles();
            } finally {
                backfillRunning.set(false);
            }
        }

        return staffRepository.findAll();
    }

    private List<Staff> backfillMissingStaffProfiles() {
        List<Staff> staffList;
        try {
            staffList = new ArrayList<>(staffRepository.findAll());
        } catch (Exception e) {
            staffList = new ArrayList<>();
        }

        try {
            List<User> users = userRepository.findAll();
            if (users == null || users.isEmpty()) {
                return staffList;
            }

            Set<String> existingUserUids = staffList.stream()
                    .map(Staff::getUserUid)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            Set<String> existingEmployeeIds = staffList.stream()
                    .map(Staff::getEmployeeId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toCollection(HashSet::new));

            boolean createdAny = false;

            for (User user : users) {
                if (user.getRole() != null && !Role.CUSTOMER.name().equalsIgnoreCase(user.getRole())) {
                    if (!existingUserUids.contains(user.getUid())) {
                        Staff created = createDefaultStaffForUser(user, existingEmployeeIds);
                        if (created != null) {
                            staffList.add(created);
                            createdAny = true;
                            if (created.getUserUid() != null) {
                                existingUserUids.add(created.getUserUid());
                            }
                            if (created.getEmployeeId() != null) {
                                existingEmployeeIds.add(created.getEmployeeId());
                            }
                        }
                    }
                }
            }

            // The repository caches for 60s, so without this the records we
            // just wrote would stay invisible to the next read.
            if (createdAny) {
                staffRepository.clearCache();
            }
        } catch (Exception ignored) {
            // Gracefully ignore if firestore query fails
        }

        return staffList;
    }

    private Staff createDefaultStaffForUser(User user) {
        return createDefaultStaffForUser(user, null);
    }

    private Staff createDefaultStaffForUser(User user, Set<String> existingEmployeeIds) {
        StaffDepartment dept = mapRoleToDepartment(user.getRole());
        if (dept == null) return null;

        Staff staff = new Staff();
        staff.setStaffId(UUID.randomUUID().toString());
        staff.setUserUid(user.getUid());

        String shortUid = user.getUid() != null && user.getUid().length() >= 6
                ? user.getUid().substring(0, 6).toUpperCase()
                : UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String empId = "EMP-" + shortUid;

        boolean idInUse = existingEmployeeIds != null
                ? existingEmployeeIds.contains(empId)
                : staffRepository.findByEmployeeId(empId).isPresent();

        if (idInUse) {
            empId = "EMP-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }

        staff.setEmployeeId(empId);
        staff.setDepartment(dept);
        staff.setPosition(formatPosition(user.getRole()));
        staff.setHireDate(java.time.LocalDate.now());
        staff.setSalary(0.0);
        staff.setEmploymentStatus(user.isEnabled() ? EmploymentStatus.ACTIVE : EmploymentStatus.INACTIVE);
        staff.setEmergencyContact(user.getPhone());
        staff.setCreatedAt(Instant.now());
        staff.setUpdatedAt(Instant.now());

        try {
            Staff saved = staffRepository.save(staff);
            if (existingEmployeeIds != null) {
                existingEmployeeIds.add(empId);
            }
            return saved;
        } catch (Exception e) {
            return staff;
        }
    }

    private StaffDepartment mapRoleToDepartment(String role) {
        if (role == null) return null;
        return switch (role.toUpperCase()) {
            case "HOUSEKEEPING" -> StaffDepartment.HOUSEKEEPING;
            case "MAINTENANCE" -> StaffDepartment.MAINTENANCE;
            case "RECEPTIONIST" -> StaffDepartment.FRONT_OFFICE;
            case "ACCOUNTANT" -> StaffDepartment.FINANCE;
            case "MANAGER", "ADMIN" -> StaffDepartment.MANAGEMENT;
            case "STAFF" -> StaffDepartment.OTHER;
            default -> null;
        };
    }

    private String formatPosition(String role) {
        if (role == null) return "Staff Member";
        return switch (role.toUpperCase()) {
            case "HOUSEKEEPING" -> "Housekeeper";
            case "MAINTENANCE" -> "Maintenance Technician";
            case "RECEPTIONIST" -> "Receptionist";
            case "ACCOUNTANT" -> "Accountant";
            case "MANAGER" -> "Manager";
            case "ADMIN" -> "Administrator";
            default -> "Staff Member";
        };
    }

    public void deleteStaff(String staffId) {
        getStaffById(staffId);
        staffRepository.delete(staffId);
    }
}

