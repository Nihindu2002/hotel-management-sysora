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
import java.util.concurrent.ExecutionException;

@Repository
public class StaffRepository {

    private final Firestore firestore;

    public StaffRepository(Firestore firestore) {
        this.firestore = firestore;
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
            return staff;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save staff", exception);
        }
    }

    public Optional<Staff> findById(String staffId) {
        DocumentReference document = firestore.collection("staff")
                .document(staffId);

        try {
            DocumentSnapshot snapshot = document.get().get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }
            return Optional.of(toStaff(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by id", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by id", exception);
        }
    }

    public Optional<Staff> findByUserUid(String userUid) {
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
            return Optional.of(toStaff(documents.get(0)));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by userUid", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by userUid", exception);
        }
    }

    public Optional<Staff> findByEmployeeId(String employeeId) {
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
            return Optional.of(toStaff(documents.get(0)));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find staff by employeeId", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find staff by employeeId", exception);
        }
    }

    public List<Staff> findAll() {
        try {
            var documents = firestore.collection("staff")
                    .get()
                    .get()
                    .getDocuments();

            List<Staff> staffList = new ArrayList<>();
            for (var snapshot : documents) {
                staffList.add(toStaff(snapshot));
            }
            return staffList;
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

