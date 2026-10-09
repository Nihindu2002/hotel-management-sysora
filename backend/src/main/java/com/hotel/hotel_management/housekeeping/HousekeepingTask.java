package com.hotel.hotel_management.housekeeping;

import java.time.Instant;

public class HousekeepingTask {

    private String taskId;
    private String roomId;
    private String assignedTo;
    private HousekeepingTaskType taskType;
    private HousekeepingTaskPriority priority;
    private HousekeepingTaskStatus status;
    private String notes;
    private Instant createdAt;
    private Instant startedAt;
    private Instant completedAt;
    private Instant updatedAt;

    public HousekeepingTask() {
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public String getAssignedTo() {
        return assignedTo;
    }

    public void setAssignedTo(String assignedTo) {
        this.assignedTo = assignedTo;
    }

    public HousekeepingTaskType getTaskType() {
        return taskType;
    }

    public void setTaskType(HousekeepingTaskType taskType) {
        this.taskType = taskType;
    }

    public HousekeepingTaskPriority getPriority() {
        return priority;
    }

    public void setPriority(HousekeepingTaskPriority priority) {
        this.priority = priority;
    }

    public HousekeepingTaskStatus getStatus() {
        return status;
    }

    public void setStatus(HousekeepingTaskStatus status) {
        this.status = status;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}

