package com.hotel.hotel_management.staff;

import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class StaffService {

    private final StaffRepository staffRepository;
    private final UserRepository userRepository;

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
                .orElseThrow(() -> new IllegalArgumentException("Staff member not found for user"));
    }

    public List<Staff> getAllStaff() {
        return staffRepository.findAll();
    }

    public List<Staff> getStaff(StaffDepartment department, EmploymentStatus status) {
        List<Staff> staffList = staffRepository.findAll();

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

    public void deleteStaff(String staffId) {
        getStaffById(staffId);
        staffRepository.delete(staffId);
    }
}

