package com.hotel.hotel_management.housekeeping;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class HousekeepingService {

    private final HousekeepingRepository housekeepingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;

    public HousekeepingService(
            HousekeepingRepository housekeepingRepository,
            RoomRepository roomRepository,
            UserRepository userRepository) {

        this.housekeepingRepository = housekeepingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
    }

    public HousekeepingTask createTask(CreateHousekeepingTaskRequest request) {

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Room not found"));

        if (request.taskType() == HousekeepingTaskType.CHECKOUT_CLEANING) {
            List<HousekeepingTask> existingTasks =
                    housekeepingRepository.findByRoomId(request.roomId());

            boolean hasActiveTask = existingTasks.stream()
                    .anyMatch(task ->
                            task.getStatus() == HousekeepingTaskStatus.PENDING
                                    || task.getStatus() == HousekeepingTaskStatus.ASSIGNED
                                    || task.getStatus() == HousekeepingTaskStatus.IN_PROGRESS);

            if (hasActiveTask) {
                throw new IllegalArgumentException(
                        "Room already has an active housekeeping task");
            }
        }

        Instant now = Instant.now();

        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId(UUID.randomUUID().toString());
        task.setRoomId(room.getRoomId());
        task.setAssignedTo(null);
        task.setTaskType(request.taskType());
        task.setPriority(request.priority());
        task.setStatus(HousekeepingTaskStatus.PENDING);
        task.setNotes(request.notes());
        task.setCreatedAt(now);
        task.setUpdatedAt(now);

        return housekeepingRepository.save(task);
    }

    public HousekeepingTask assignTask(String taskId, String staffUid) {

        HousekeepingTask task = getTaskById(taskId);

        if (task.getStatus() == HousekeepingTaskStatus.COMPLETED
                || task.getStatus() == HousekeepingTaskStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Completed or cancelled tasks cannot be assigned");
        }

        User staff = userRepository.findByUid(staffUid)
                .orElseThrow(() ->
                        new IllegalArgumentException("Staff user not found"));

        if (!Role.HOUSEKEEPING.name().equals(staff.getRole())) {
            throw new IllegalArgumentException(
                    "Staff must have HOUSEKEEPING role");
        }

        return housekeepingRepository.updateAssignment(
                taskId,
                staffUid,
                HousekeepingTaskStatus.ASSIGNED);
    }

    public HousekeepingTask startTask(String taskId, String staffUid) {

        HousekeepingTask task = getTaskById(taskId);

        if (task.getStatus() != HousekeepingTaskStatus.ASSIGNED) {
            throw new IllegalArgumentException(
                    "Only assigned tasks can be started");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to start this task");
        }

        return housekeepingRepository.updateStatus(
                taskId,
                HousekeepingTaskStatus.IN_PROGRESS,
                Instant.now());
    }

    public HousekeepingTask completeTask(String taskId, String staffUid) {

        HousekeepingTask task = getTaskById(taskId);

        if (task.getStatus() != HousekeepingTaskStatus.IN_PROGRESS) {
            throw new IllegalArgumentException(
                    "Only in-progress tasks can be completed");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to complete this task");
        }

        HousekeepingTask completedTask = housekeepingRepository.updateStatus(
                taskId,
                HousekeepingTaskStatus.COMPLETED,
                Instant.now());

        if (task.getTaskType() == HousekeepingTaskType.CHECKOUT_CLEANING) {
            Room room = roomRepository.findById(task.getRoomId()).orElse(null);
            if (room != null && room.getStatus() == RoomStatus.CLEANING) {
                roomRepository.updateStatus(room.getRoomId(), RoomStatus.AVAILABLE);
            }
        }

        return completedTask;
    }

    public HousekeepingTask cancelTask(String taskId) {

        HousekeepingTask task = getTaskById(taskId);

        if (task.getStatus() == HousekeepingTaskStatus.COMPLETED
                || task.getStatus() == HousekeepingTaskStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Completed or cancelled tasks cannot be cancelled");
        }

        return housekeepingRepository.updateStatus(
                taskId,
                HousekeepingTaskStatus.CANCELLED,
                null);
    }

    public HousekeepingTask getTaskById(String taskId) {
        return housekeepingRepository.findById(taskId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Housekeeping task not found"));
    }

    public List<HousekeepingTask> getAllTasks() {
        return housekeepingRepository.findAll();
    }

    public List<HousekeepingTask> getTasksByRoomId(String roomId) {
        return housekeepingRepository.findByRoomId(roomId);
    }

    public List<HousekeepingTask> getMyTasks(String staffUid) {
        return housekeepingRepository.findByAssignedTo(staffUid);
    }
}

