package com.hotel.hotel_management.maintenance;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
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
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;

@Service
public class MaintenanceService {

    private final MaintenanceRepository maintenanceRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final HousekeepingRepository housekeepingRepository;
    private final StaffRepository staffRepository;
    private final FinanceService financeService;
    private final ReservationRepository reservationRepository;
    private final NotificationService notificationService;

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository,
            StaffRepository staffRepository) {
        this(maintenanceRepository, roomRepository, userRepository, housekeepingRepository, staffRepository, null, null, null);
    }

    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository,
            StaffRepository staffRepository,
            FinanceService financeService) {
        this(maintenanceRepository, roomRepository, userRepository, housekeepingRepository, staffRepository, financeService, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public MaintenanceService(
            MaintenanceRepository maintenanceRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            HousekeepingRepository housekeepingRepository,
            StaffRepository staffRepository,
            FinanceService financeService,
            ReservationRepository reservationRepository,
            NotificationService notificationService) {

        this.maintenanceRepository = maintenanceRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.housekeepingRepository = housekeepingRepository;
        this.staffRepository = staffRepository;
        this.financeService = financeService;
        this.reservationRepository = reservationRepository;
        this.notificationService = notificationService;
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

        MaintenanceTask assigned = maintenanceRepository.updateAssignment(
                taskId,
                staffUid,
                MaintenanceStatus.ASSIGNED);

        if (notificationService != null) {
            notificationService.emit(
                    staffUid,
                    NotificationType.MAINTENANCE,
                    "Maintenance task assigned",
                    "You have been assigned a maintenance task for room " + task.getRoomId()
                            + ": " + (task.getDescription() != null
                                    ? task.getDescription()
                                    : task.getIssueType()),
                    "/maintenance/tasks",
                    taskId);
        }

        return assigned;
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
        return completeTask(taskId, staffUid, 0.0, null);
    }

    public MaintenanceTask completeTask(
            String taskId,
            String staffUid,
            Double actualCost) {
        return completeTask(taskId, staffUid, actualCost, null);
    }

    public MaintenanceTask completeTask(
            String taskId,
            String staffUid,
            Double actualCost,
            String completionNotes) {

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
                cost,
                completionNotes);

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
        return maintenanceRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(MaintenanceTask::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .toList();
    }

    /**
     * Returns maintenance tasks matching the supplied filters. Any filter left
     * {@code null} is ignored. Filtering is applied in memory because Firestore
     * would otherwise require a composite index for each filter combination.
     */
    public List<MaintenanceTask> getTasksFiltered(
            MaintenanceStatus status,
            MaintenancePriority priority,
            MaintenanceIssueType issueType,
            String assignedTo,
            String roomId) {

        Stream<MaintenanceTask> tasks = maintenanceRepository.findAll().stream();

        if (status != null) {
            tasks = tasks.filter(t -> t.getStatus() == status);
        }
        if (priority != null) {
            tasks = tasks.filter(t -> t.getPriority() == priority);
        }
        if (issueType != null) {
            tasks = tasks.filter(t -> t.getIssueType() == issueType);
        }
        if (assignedTo != null && !assignedTo.isBlank()) {
            tasks = tasks.filter(t -> assignedTo.equals(t.getAssignedTo()));
        }
        if (roomId != null && !roomId.isBlank()) {
            tasks = tasks.filter(t -> roomId.equals(t.getRoomId()));
        }

        return tasks.toList();
    }

    public MaintenanceDashboardResponse getDashboard() {

        List<MaintenanceTask> tasks = maintenanceRepository.findAll();
        LocalDate today = LocalDate.now(ZoneId.systemDefault());

        long pending = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.PENDING).count();
        long assigned = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.ASSIGNED).count();
        long inProgress = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.IN_PROGRESS).count();
        long cancelled = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.CANCELLED).count();

        long completedToday = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.COMPLETED)
                .filter(t -> t.getCompletedAt() != null)
                .filter(t -> LocalDate.ofInstant(t.getCompletedAt(), ZoneId.systemDefault())
                        .equals(today))
                .count();

        long highPriorityActive = tasks.stream()
                .filter(t -> t.getPriority() == MaintenancePriority.HIGH
                        || t.getPriority() == MaintenancePriority.URGENT)
                .filter(t -> t.getStatus() != MaintenanceStatus.COMPLETED
                        && t.getStatus() != MaintenanceStatus.CANCELLED)
                .count();

        double totalCost = tasks.stream()
                .filter(t -> t.getStatus() == MaintenanceStatus.COMPLETED)
                .filter(t -> t.getActualCost() != null)
                .mapToDouble(MaintenanceTask::getActualCost)
                .sum();

        return new MaintenanceDashboardResponse(
                pending,
                assigned,
                inProgress,
                completedToday,
                highPriorityActive,
                cancelled,
                tasks.size(),
                totalCost);
    }

    public List<MaintenanceTask> getTasksByRoomId(String roomId) {
        return maintenanceRepository.findByRoomId(roomId);
    }

    public List<MaintenanceTask> getMyTasks(String staffUid) {
        return maintenanceRepository.findByAssignedTo(staffUid);
    }

    /**
     * Resolves the room's status once a maintenance task stops blocking it.
     *
     * <p>The room was forced to {@link RoomStatus#MAINTENANCE} when maintenance
     * began, so the previous status cannot simply be restored — other processes
     * may now own the room. The room is resolved to the first matching state, in
     * priority order: still under maintenance, occupied by an in-house guest,
     * awaiting cleaning, held by an upcoming reservation, or finally available.
     */
    private void updateRoomStatusAfterMaintenanceResolution(
            String roomId,
            String currentTaskId) {

        List<MaintenanceTask> roomMaintenanceTasks =
                maintenanceRepository.findByRoomId(roomId);

        boolean hasOtherActiveMaintenance = roomMaintenanceTasks.stream()
                .filter(t -> !t.getTaskId().equals(currentTaskId))
                .anyMatch(t -> isActiveMaintenanceStatus(t.getStatus()));

        if (hasOtherActiveMaintenance) {
            return;
        }

        Room room = roomRepository.findById(roomId).orElse(null);
        if (room == null) {
            return;
        }

        // A guest currently in the room outranks every cleaning/reservation state.
        if (hasCheckedInReservation(roomId)) {
            roomRepository.updateStatus(roomId, RoomStatus.OCCUPIED);
            return;
        }

        if (hasActiveHousekeepingTask(roomId)) {
            roomRepository.updateStatus(roomId, RoomStatus.CLEANING);
            return;
        }

        if (hasUpcomingReservation(roomId)) {
            roomRepository.updateStatus(roomId, RoomStatus.RESERVED);
            return;
        }

        // Only release a room this task actually blocked; never resurrect a
        // status another process changed while maintenance was in progress.
        if (room.getStatus() == RoomStatus.MAINTENANCE) {
            roomRepository.updateStatus(roomId, RoomStatus.AVAILABLE);
        }
    }

    private boolean isActiveMaintenanceStatus(MaintenanceStatus status) {
        return status == MaintenanceStatus.PENDING
                || status == MaintenanceStatus.ASSIGNED
                || status == MaintenanceStatus.IN_PROGRESS;
    }

    private boolean hasActiveHousekeepingTask(String roomId) {
        return housekeepingRepository.findByRoomId(roomId).stream()
                .anyMatch(h -> h.getStatus() == HousekeepingTaskStatus.PENDING
                        || h.getStatus() == HousekeepingTaskStatus.ASSIGNED
                        || h.getStatus() == HousekeepingTaskStatus.IN_PROGRESS);
    }

    private List<Reservation> findReservations(String roomId) {
        if (reservationRepository == null) {
            return List.of();
        }
        return reservationRepository.findByRoomId(roomId);
    }

    private boolean hasCheckedInReservation(String roomId) {
        return findReservations(roomId).stream()
                .anyMatch(r -> r.getStatus() == ReservationStatus.CHECKED_IN);
    }

    private boolean hasUpcomingReservation(String roomId) {
        LocalDate today = LocalDate.now(ZoneId.systemDefault());
        return findReservations(roomId).stream()
                .filter(r -> r.getStatus() == ReservationStatus.CONFIRMED
                        || r.getStatus() == ReservationStatus.PENDING)
                .anyMatch(r -> r.getCheckOutDate() == null
                        || !r.getCheckOutDate().isBefore(today));
    }
}

