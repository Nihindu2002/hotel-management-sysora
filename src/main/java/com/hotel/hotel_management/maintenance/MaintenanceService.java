package com.hotel.hotel_management.maintenance;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.user.UserRepository;
import com.hotel.hotel_management.staff.EmploymentStatus;
import com.hotel.hotel_management.staff.Staff;
import com.hotel.hotel_management.staff.StaffDepartment;
import com.hotel.hotel_management.staff.StaffRepository;
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
    private final StaffRepository staffRepository;
    private final FinanceService financeService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository,
            StaffRepository staffRepository) {
        this(maintenanceRepository, roomRepository, userRepository, housekeepingRepository, staffRepository, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository,
            StaffRepository staffRepository,
            FinanceService financeService) {

        this.maintenanceRepository = maintenanceRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.housekeepingRepository = housekeepingRepository;
        this.staffRepository = staffRepository;
        this.financeService = financeService;
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

        Staff staffProfile = staffRepository.findByUserUid(staffUid)
                .orElseThrow(() ->
                        new IllegalArgumentException("Staff profile not found"));

        if (staffProfile.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new IllegalArgumentException("Staff member is not active");
        }

        if (staffProfile.getDepartment() != StaffDepartment.MAINTENANCE) {
            throw new IllegalArgumentException("Staff member must belong to MAINTENANCE department");
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

        Staff staff = staffRepository.findByUserUid(staffUid)
                .orElseThrow(() ->
                        new ForbiddenException("Staff profile not found"));

        if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new ForbiddenException("Staff member is not active");
        }

        return maintenanceRepository.updateStatus(
                taskId,
                MaintenanceStatus.IN_PROGRESS,
                Instant.now());
    }

    public MaintenanceTask completeTask(String taskId, String staffUid) {
        return completeTask(taskId, staffUid, 0.0);
    }

    public MaintenanceTask completeTask(
            String taskId,
            String staffUid,
            Double actualCost) {

        MaintenanceTask task = getTaskById(taskId);

        if (task.getStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new IllegalArgumentException(
                    "Only in-progress tasks can be completed");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to complete this task");
        }

        if (actualCost != null && actualCost < 0) {
            throw new IllegalArgumentException(
                    "Actual cost cannot be negative");
        }

        Staff staff = staffRepository.findByUserUid(staffUid)
                .orElseThrow(() ->
                        new ForbiddenException("Staff profile not found"));

        if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new ForbiddenException("Staff member is not active");
        }

        Double cost = actualCost != null ? actualCost : 0.0;

        MaintenanceTask completedTask = maintenanceRepository.updateStatus(
                taskId,
                MaintenanceStatus.COMPLETED,
                Instant.now(),
                cost);

        updateRoomStatusAfterMaintenanceResolution(task.getRoomId(), taskId);

        if (cost > 0 && financeService != null) {
            financeService.recordMaintenanceExpense(completedTask, staffUid);
        }

        return completedTask;
    }

    public MaintenanceTask updateTaskCost(
            String taskId,
            Double actualCost,
            String performedBy) {

        if (actualCost == null || actualCost < 0) {
            throw new IllegalArgumentException(
                    "Actual cost cannot be negative");
        }

        MaintenanceTask task = getTaskById(taskId);

        MaintenanceTask updatedTask = maintenanceRepository.updateCost(taskId, actualCost);

        if (task.getStatus() == MaintenanceStatus.COMPLETED && financeService != null) {
            financeService.updateMaintenanceExpense(updatedTask, actualCost, performedBy);
        }

        return updatedTask;
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
                null,
                task.getActualCost());

        updateRoomStatusAfterMaintenanceResolution(task.getRoomId(), taskId);

        if (financeService != null) {
            financeService.cancelMaintenanceExpense(taskId);
        }

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

