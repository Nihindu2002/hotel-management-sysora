package com.hotel.hotel_management.maintenance;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
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
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final HousekeepingRepository housekeepingRepository;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository) {

        this.maintenanceRepository = maintenanceRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.housekeepingRepository = housekeepingRepository;
    }

    public MaintenanceTask createTask(
            CreateMaintenanceTaskRequest request,
            String reporterUid) {

        Room room = roomRepository.findById(request.roomId())
                .orElseThrow(() ->
                        new IllegalArgumentException("Room not found"));

        Instant now = Instant.now();

        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId(UUID.randomUUID().toString());
        task.setRoomId(room.getRoomId());
        task.setReportedBy(reporterUid);
        task.setAssignedTo(null);
        task.setIssueType(request.issueType());
        task.setPriority(request.priority());
        task.setDescription(request.description());
        task.setStatus(MaintenanceStatus.PENDING);
        task.setCreatedAt(now);
        task.setUpdatedAt(now);

        roomRepository.updateStatus(room.getRoomId(), RoomStatus.MAINTENANCE);

        return maintenanceRepository.save(task);
    }

    public MaintenanceTask assignTask(String taskId, String staffUid) {

        MaintenanceTask task = getTaskById(taskId);

        if (task.getStatus() == MaintenanceStatus.COMPLETED
                || task.getStatus() == MaintenanceStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Completed or cancelled tasks cannot be assigned");
        }

        User staff = userRepository.findByUid(staffUid)
                .orElseThrow(() ->
                        new IllegalArgumentException("Staff user not found"));

        if (!Role.MAINTENANCE.name().equals(staff.getRole())) {
            throw new IllegalArgumentException(
                    "Staff must have MAINTENANCE role");
        }

        return maintenanceRepository.updateAssignment(
                taskId,
                staffUid,
                MaintenanceStatus.ASSIGNED);
    }

    public MaintenanceTask startTask(String taskId, String staffUid) {

        MaintenanceTask task = getTaskById(taskId);

        if (task.getStatus() != MaintenanceStatus.ASSIGNED) {
            throw new IllegalArgumentException(
                    "Only assigned tasks can be started");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to start this task");
        }

        return maintenanceRepository.updateStatus(
                taskId,
                MaintenanceStatus.IN_PROGRESS,
                Instant.now());
    }

    public MaintenanceTask completeTask(String taskId, String staffUid) {

        MaintenanceTask task = getTaskById(taskId);

        if (task.getStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new IllegalArgumentException(
                    "Only in-progress tasks can be completed");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to complete this task");
        }

        MaintenanceTask completedTask = maintenanceRepository.updateStatus(
                taskId,
                MaintenanceStatus.COMPLETED,
                Instant.now());

        updateRoomStatusAfterMaintenanceResolution(task.getRoomId(), taskId);

        return completedTask;
    }

    public MaintenanceTask cancelTask(String taskId) {

        MaintenanceTask task = getTaskById(taskId);

        if (task.getStatus() == MaintenanceStatus.COMPLETED
                || task.getStatus() == MaintenanceStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "Completed or cancelled tasks cannot be cancelled");
        }

        MaintenanceTask cancelledTask = maintenanceRepository.updateStatus(
                taskId,
                MaintenanceStatus.CANCELLED,
                null);

        updateRoomStatusAfterMaintenanceResolution(task.getRoomId(), taskId);

        return cancelledTask;
    }

    public MaintenanceTask getTaskById(String taskId) {
        return maintenanceRepository.findById(taskId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Maintenance task not found"));
    }

    public List<MaintenanceTask> getAllTasks() {
        return maintenanceRepository.findAll();
    }

    public List<MaintenanceTask> getTasksByRoomId(String roomId) {
        return maintenanceRepository.findByRoomId(roomId);
    }

    public List<MaintenanceTask> getMyTasks(String staffUid) {
        return maintenanceRepository.findByAssignedTo(staffUid);
    }

    private void updateRoomStatusAfterMaintenanceResolution(
            String roomId,
            String currentTaskId) {

        List<MaintenanceTask> roomMaintenanceTasks =
                maintenanceRepository.findByRoomId(roomId);

        boolean hasOtherActiveMaintenance = roomMaintenanceTasks.stream()
                .filter(t -> !t.getTaskId().equals(currentTaskId))
                .anyMatch(t ->
                        t.getStatus() == MaintenanceStatus.PENDING
                                || t.getStatus() == MaintenanceStatus.ASSIGNED
                                || t.getStatus() == MaintenanceStatus.IN_PROGRESS);

        if (hasOtherActiveMaintenance) {
            return;
        }

        List<HousekeepingTask> roomHousekeepingTasks =
                housekeepingRepository.findByRoomId(roomId);

        boolean hasActiveHousekeeping = roomHousekeepingTasks.stream()
                .anyMatch(h ->
                        h.getStatus() == HousekeepingTaskStatus.PENDING
                                || h.getStatus() == HousekeepingTaskStatus.ASSIGNED
                                || h.getStatus() == HousekeepingTaskStatus.IN_PROGRESS);

        if (hasActiveHousekeeping) {
            roomRepository.updateStatus(roomId, RoomStatus.CLEANING);
        } else {
            Room room = roomRepository.findById(roomId).orElse(null);
            if (room != null && room.getStatus() == RoomStatus.MAINTENANCE) {
                roomRepository.updateStatus(roomId, RoomStatus.AVAILABLE);
            }
        }
    }
}

