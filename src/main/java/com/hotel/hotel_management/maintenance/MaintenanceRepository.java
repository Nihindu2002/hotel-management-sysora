package com.hotel.hotel_management.maintenance;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class MaintenanceRepository {

    private final Firestore firestore;

    public MaintenanceRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public MaintenanceTask save(MaintenanceTask task) {

        DocumentReference document =
                firestore.collection("maintenanceTasks")
                        .document(task.getTaskId());

        Map<String, Object> data = new HashMap<>();
        data.put("taskId", task.getTaskId());
        data.put("roomId", task.getRoomId());
        data.put("reportedBy", task.getReportedBy());
        data.put("assignedTo", task.getAssignedTo());
        data.put("issueType", task.getIssueType() != null ? task.getIssueType().name() : null);
        data.put("priority", task.getPriority() != null ? task.getPriority().name() : null);
        data.put("description", task.getDescription());
        data.put("status", task.getStatus() != null ? task.getStatus().name() : MaintenanceStatus.PENDING.name());
        data.put("createdAt", task.getCreatedAt());
        data.put("startedAt", task.getStartedAt());
        data.put("completedAt", task.getCompletedAt());
        data.put("updatedAt", task.getUpdatedAt());

        try {
            document.set(data).get();
            return task;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save maintenance task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save maintenance task", exception);
        }
    }

    public Optional<MaintenanceTask> findById(String taskId) {

        DocumentReference document =
                firestore.collection("maintenanceTasks")
                        .document(taskId);

        try {
            DocumentSnapshot snapshot = document.get().get();

            if (!snapshot.exists()) {
                return Optional.empty();
            }

            return Optional.of(toTask(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find maintenance task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find maintenance task", exception);
        }
    }

    public List<MaintenanceTask> findAll() {

        try {
            var documents =
                    firestore.collection("maintenanceTasks")
                            .get()
                            .get()
                            .getDocuments();

            List<MaintenanceTask> tasks = new ArrayList<>();
            for (var snapshot : documents) {
                tasks.add(toTask(snapshot));
            }

            return tasks;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find maintenance tasks", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find maintenance tasks", exception);
        }
    }

    public List<MaintenanceTask> findByRoomId(String roomId) {

        try {
            var documents =
                    firestore.collection("maintenanceTasks")
                            .whereEqualTo("roomId", roomId)
                            .get()
                            .get()
                            .getDocuments();

            List<MaintenanceTask> tasks = new ArrayList<>();
            for (var snapshot : documents) {
                tasks.add(toTask(snapshot));
            }

            return tasks;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find tasks for room", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find tasks for room", exception);
        }
    }

    public List<MaintenanceTask> findByAssignedTo(String staffUid) {

        try {
            var documents =
                    firestore.collection("maintenanceTasks")
                            .whereEqualTo("assignedTo", staffUid)
                            .get()
                            .get()
                            .getDocuments();

            List<MaintenanceTask> tasks = new ArrayList<>();
            for (var snapshot : documents) {
                tasks.add(toTask(snapshot));
            }

            return tasks;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find tasks for staff", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find tasks for staff", exception);
        }
    }

    public MaintenanceTask updateAssignment(
            String taskId,
            String staffUid,
            MaintenanceStatus status) {

        DocumentReference document =
                firestore.collection("maintenanceTasks")
                        .document(taskId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("assignedTo", staffUid);
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();
            return findById(taskId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Maintenance task not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update task assignment", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update task assignment", exception);
        }
    }

    public MaintenanceTask updateStatus(
            String taskId,
            MaintenanceStatus status,
            Instant timestamp) {

        DocumentReference document =
                firestore.collection("maintenanceTasks")
                        .document(taskId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        if (status == MaintenanceStatus.IN_PROGRESS && timestamp != null) {
            updates.put("startedAt", timestamp);
        } else if (status == MaintenanceStatus.COMPLETED && timestamp != null) {
            updates.put("completedAt", timestamp);
        }

        try {
            document.update(updates).get();
            return findById(taskId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Maintenance task not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update task status", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update task status", exception);
        }
    }

    public void delete(String taskId) {

        DocumentReference document =
                firestore.collection("maintenanceTasks")
                        .document(taskId);

        try {
            document.delete().get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete maintenance task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete maintenance task", exception);
        }
    }

    private MaintenanceTask toTask(DocumentSnapshot snapshot) {

        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId(snapshot.getString("taskId"));
        task.setRoomId(snapshot.getString("roomId"));
        task.setReportedBy(snapshot.getString("reportedBy"));
        task.setAssignedTo(snapshot.getString("assignedTo"));

        String issueTypeStr = snapshot.getString("issueType");
        if (issueTypeStr != null) {
            task.setIssueType(MaintenanceIssueType.valueOf(issueTypeStr));
        }

        String priorityStr = snapshot.getString("priority");
        if (priorityStr != null) {
            task.setPriority(MaintenancePriority.valueOf(priorityStr));
        }

        String statusStr = snapshot.getString("status");
        if (statusStr != null) {
            task.setStatus(MaintenanceStatus.valueOf(statusStr));
        }

        task.setDescription(snapshot.getString("description"));

        if (snapshot.getTimestamp("createdAt") != null) {
            task.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("startedAt") != null) {
            task.setStartedAt(snapshot.getTimestamp("startedAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("completedAt") != null) {
            task.setCompletedAt(snapshot.getTimestamp("completedAt").toDate().toInstant());
        }

        if (snapshot.getTimestamp("updatedAt") != null) {
            task.setUpdatedAt(snapshot.getTimestamp("updatedAt").toDate().toInstant());
        }

        return task;
    }
}

