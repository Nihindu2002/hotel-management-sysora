package com.hotel.hotel_management.staff;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Repository
public class StaffRepository {

    private final Firestore firestore;
    private final Map<String, Staff> staffByIdCache = new ConcurrentHashMap<>();
    private final Map<String, Staff> staffByUserUidCache = new ConcurrentHashMap<>();
    private final Map<String, Staff> staffByEmployeeIdCache = new ConcurrentHashMap<>();
    private volatile List<Staff> allStaffCache = null;
    private volatile long cacheExpiryTime = 0L;
    private static final long CACHE_TTL_MS = 60 * 1000L; // 60 seconds

    public StaffRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public void clearCache() {
        allStaffCache = null;
        staffByIdCache.clear();
        staffByUserUidCache.clear();
        staffByEmployeeIdCache.clear();
        cacheExpiryTime = 0L;
    }

    public Staff save(Staff staff) {
        DocumentReference document = firestore.collection("staff")
                .document(staff.getStaffId());

        Map<String, Object> data = new HashMap<>();
        data.put("staffId", staff.getStaffId());
        data.put("userUid", staff.getUserUid());
        data.put("employeeId", staff.getEmployeeId());
        data.put("department", staff.getDepartment() != null ? staff.getDepartment().name() : null);
        data.put("position", staff.getPosition());
        data.put("hireDate", staff.getHireDate() != null ? staff.getHireDate().toString() : null);
        data.put("salary", staff.getSalary() != null ? staff.getSalary() : 0.0);
        data.put("employmentStatus", staff.getEmploymentStatus() != null ? staff.getEmploymentStatus().name() : EmploymentStatus.ACTIVE.name());
        data.put("emergencyContact", staff.getEmergencyContact());
        data.put("createdAt", staff.getCreatedAt() != null ? Date.from(staff.getCreatedAt()) : Date.from(Instant.now()));
        data.put("updatedAt", staff.getUpdatedAt() != null ? Date.from(staff.getUpdatedAt()) : Date.from(Instant.now()));

        try {
            document.set(data).get();
            clearCache();
            return staff;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save staff", exception);
        }
    }

    public Optional<Staff> findById(String staffId) {
        if (staffId == null) {
            return Optional.empty();
        }

        Staff cached = staffByIdCache.get(staffId);
        if (cached != null && System.currentTimeMillis() < cacheExpiryTime) {
            return Optional.of(cached);
        }

        DocumentReference document = firestore.collection("staff")
                .document(staffId);

        try {
            DocumentSnapshot snapshot = document.get().get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }
            Staff staff = toStaff(snapshot);
            staffByIdCache.put(staffId, staff);
            return Optional.of(staff);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by id", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by id", exception);
        }
    }

    public Optional<Staff> findByUserUid(String userUid) {
        if (userUid == null) {
            return Optional.empty();
        }

        Staff cached = staffByUserUidCache.get(userUid);
        if (cached != null && System.currentTimeMillis() < cacheExpiryTime) {
            return Optional.of(cached);
        }

        try {
            var documents = firestore.collection("staff")
                    .whereEqualTo("userUid", userUid)
                    .limit(1)
                    .get()
                    .get()
                    .getDocuments();

            if (documents.isEmpty()) {
                return Optional.empty();
            }
            Staff staff = toStaff(documents.get(0));
            staffByUserUidCache.put(userUid, staff);
            return Optional.of(staff);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by userUid", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by userUid", exception);
        }
    }

    public Optional<Staff> findByEmployeeId(String employeeId) {
        if (employeeId == null) {
            return Optional.empty();
        }

        Staff cached = staffByEmployeeIdCache.get(employeeId);
        if (cached != null && System.currentTimeMillis() < cacheExpiryTime) {
            return Optional.of(cached);
        }

        try {
            var documents = firestore.collection("staff")
                    .whereEqualTo("employeeId", employeeId)
                    .limit(1)
                    .get()
                    .get()
                    .getDocuments();

            if (documents.isEmpty()) {
                return Optional.empty();
            }
            Staff staff = toStaff(documents.get(0));
            staffByEmployeeIdCache.put(employeeId, staff);
            return Optional.of(staff);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by employeeId", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by employeeId", exception);
        }
    }

    public List<Staff> findAll() {
        long now = System.currentTimeMillis();
        List<Staff> cached = allStaffCache;
        if (cached != null && now < cacheExpiryTime) {
            return new ArrayList<>(cached);
        }

        try {
            var documents = firestore.collection("staff")
                    .get()
                    .get()
                    .getDocuments();

            List<Staff> staffList = new ArrayList<>();
            staffByIdCache.clear();
            staffByUserUidCache.clear();
            staffByEmployeeIdCache.clear();

            for (var snapshot : documents) {
                Staff staff = toStaff(snapshot);
                staffList.add(staff);
                if (staff.getStaffId() != null) {
                    staffByIdCache.put(staff.getStaffId(), staff);
                }
                if (staff.getUserUid() != null) {
                    staffByUserUidCache.put(staff.getUserUid(), staff);
                }
                if (staff.getEmployeeId() != null) {
                    staffByEmployeeIdCache.put(staff.getEmployeeId(), staff);
                }
            }
            allStaffCache = staffList;
            cacheExpiryTime = now + CACHE_TTL_MS;
            return new ArrayList<>(staffList);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find all staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find all staff", exception);
        }
    }

    public Staff update(String staffId, UpdateStaffRequest request) {
        DocumentReference document = firestore.collection("staff")
                .document(staffId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("employeeId", request.employeeId());
        updates.put("department", request.department() != null ? request.department().name() : null);
        updates.put("position", request.position());
        updates.put("hireDate", request.hireDate() != null ? request.hireDate().toString() : null);
        updates.put("salary", request.salary());
        updates.put("emergencyContact", request.emergencyContact());
        updates.put("updatedAt", Date.from(Instant.now()));

        try {
            document.update(updates).get();
            clearCache();
            return findById(staffId)
                    .orElseThrow(() -> new IllegalArgumentException("Staff member not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update staff", exception);
        }
    }

    public Staff updateStatus(String staffId, EmploymentStatus status) {
        DocumentReference document = firestore.collection("staff")
                .document(staffId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("employmentStatus", status.name());
        updates.put("updatedAt", Date.from(Instant.now()));

        try {
            document.update(updates).get();
            clearCache();
            return findById(staffId)
                    .orElseThrow(() -> new IllegalArgumentException("Staff member not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update staff status", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update staff status", exception);
        }
    }

    public void delete(String staffId) {
        DocumentReference document = firestore.collection("staff")
                .document(staffId);

        try {
            document.delete().get();
            clearCache();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete staff", exception);
        }
    }

    private Staff toStaff(DocumentSnapshot snapshot) {
        Staff staff = new Staff();
        staff.setStaffId(snapshot.getString("staffId"));
        staff.setUserUid(snapshot.getString("userUid"));
        staff.setEmployeeId(snapshot.getString("employeeId"));

        String departmentStr = snapshot.getString("department");
        if (departmentStr != null) {
            staff.setDepartment(StaffDepartment.valueOf(departmentStr));
        }

        staff.setPosition(snapshot.getString("position"));

        String hireDateStr = snapshot.getString("hireDate");
        if (hireDateStr != null) {
            staff.setHireDate(LocalDate.parse(hireDateStr));
        }

        staff.setSalary(snapshot.getDouble("salary"));

        String statusStr = snapshot.getString("employmentStatus");
        if (statusStr != null) {
            staff.setEmploymentStatus(EmploymentStatus.valueOf(statusStr));
        }

        staff.setEmergencyContact(snapshot.getString("emergencyContact"));

        if (snapshot.getTimestamp("createdAt") != null) {
            staff.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            staff.setUpdatedAt(snapshot.getTimestamp("updatedAt").toDate().toInstant());
        }

        return staff;
    }
}

