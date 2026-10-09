package com.hotel.hotel_management.housekeeping;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutionException;

@Repository
public class HousekeepingRepository {

    private final Firestore firestore;

    public HousekeepingRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public HousekeepingTask save(HousekeepingTask task) {

        DocumentReference document =
                firestore.collection("housekeepingTasks")
                        .document(task.getTaskId());

        Map<String, Object> data = new HashMap<>();
        data.put("taskId", task.getTaskId());
        data.put("roomId", task.getRoomId());
        data.put("assignedTo", task.getAssignedTo());
        data.put("taskType", task.getTaskType() != null ? task.getTaskType().name() : null);
        data.put("priority", task.getPriority() != null ? task.getPriority().name() : null);
        data.put("status", task.getStatus() != null ? task.getStatus().name() : HousekeepingTaskStatus.PENDING.name());
        data.put("notes", task.getNotes());
        data.put("createdAt", task.getCreatedAt());
        data.put("startedAt", task.getStartedAt());
        data.put("completedAt", task.getCompletedAt());
        data.put("updatedAt", task.getUpdatedAt());

        try {
            document.set(data).get();
            return task;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save housekeeping task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save housekeeping task", exception);
        }
    }

    public Optional<HousekeepingTask> findById(String taskId) {

        DocumentReference document =
                firestore.collection("housekeepingTasks")
                        .document(taskId);

        try {
            DocumentSnapshot snapshot = document.get().get();

            if (!snapshot.exists()) {
                return Optional.empty();
            }

            return Optional.of(toTask(snapshot));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find housekeeping task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find housekeeping task", exception);
        }
    }

    public List<HousekeepingTask> findAll() {

        try {
            var documents =
                    firestore.collection("housekeepingTasks")
                            .get()
                            .get()
                            .getDocuments();

            List<HousekeepingTask> tasks = new ArrayList<>();
            for (var snapshot : documents) {
                tasks.add(toTask(snapshot));
            }

            return tasks;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find housekeeping tasks", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find housekeeping tasks", exception);
        }
    }

    public List<HousekeepingTask> findByRoomId(String roomId) {

        try {
            var documents =
                    firestore.collection("housekeepingTasks")
                            .whereEqualTo("roomId", roomId)
                            .get()
                            .get()
                            .getDocuments();

            List<HousekeepingTask> tasks = new ArrayList<>();
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

    public List<HousekeepingTask> findByAssignedTo(String staffUid) {

        try {
            var documents =
                    firestore.collection("housekeepingTasks")
                            .whereEqualTo("assignedTo", staffUid)
                            .get()
                            .get()
                            .getDocuments();

            List<HousekeepingTask> tasks = new ArrayList<>();
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

    public HousekeepingTask updateAssignment(
            String taskId,
            String staffUid,
            HousekeepingTaskStatus status) {

        DocumentReference document =
                firestore.collection("housekeepingTasks")
                        .document(taskId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("assignedTo", staffUid);
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();
            return findById(taskId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Housekeeping task not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update task assignment", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update task assignment", exception);
        }
    }

    public HousekeepingTask updateStatus(
            String taskId,
            HousekeepingTaskStatus status,
            Instant timestamp) {

        DocumentReference document =
                firestore.collection("housekeepingTasks")
                        .document(taskId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status.name());
        updates.put("updatedAt", Instant.now());

        if (status == HousekeepingTaskStatus.IN_PROGRESS && timestamp != null) {
            updates.put("startedAt", timestamp);
        } else if (status == HousekeepingTaskStatus.COMPLETED && timestamp != null) {
            updates.put("completedAt", timestamp);
        }

        try {
            document.update(updates).get();
            return findById(taskId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Housekeeping task not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update task status", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update task status", exception);
        }
    }

    public void delete(String taskId) {

        DocumentReference document =
                firestore.collection("housekeepingTasks")
                        .document(taskId);

        try {
            document.delete().get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete housekeeping task", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete housekeeping task", exception);
        }
    }

    private HousekeepingTask toTask(DocumentSnapshot snapshot) {

        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId(snapshot.getString("taskId"));
        task.setRoomId(snapshot.getString("roomId"));
        task.setAssignedTo(snapshot.getString("assignedTo"));

        String taskTypeStr = snapshot.getString("taskType");
        if (taskTypeStr != null) {
            task.setTaskType(HousekeepingTaskType.valueOf(taskTypeStr));
        }

        String priorityStr = snapshot.getString("priority");
        if (priorityStr != null) {
            task.setPriority(HousekeepingTaskPriority.valueOf(priorityStr));
        }

        String statusStr = snapshot.getString("status");
        if (statusStr != null) {
            task.setStatus(HousekeepingTaskStatus.valueOf(statusStr));
        }

        task.setNotes(snapshot.getString("notes"));

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

