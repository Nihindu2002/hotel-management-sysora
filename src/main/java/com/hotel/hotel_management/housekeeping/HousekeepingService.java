package com.hotel.hotel_management.housekeeping;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.inventory.InventoryService;
import com.hotel.hotel_management.inventory.StockOutRequest;
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

@Service
public class HousekeepingService {

    private final HousekeepingRepository housekeepingRepository;
    private final RoomRepository roomRepository;
    private final UserRepository userRepository;
    private final StaffRepository staffRepository;
    private final NotificationService notificationService;
    private final InventoryService inventoryService;

    public HousekeepingService(
            HousekeepingRepository housekeepingRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            StaffRepository staffRepository) {

        this(housekeepingRepository, roomRepository, userRepository, staffRepository, null, null);
    }

    public HousekeepingService(
            HousekeepingRepository housekeepingRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            StaffRepository staffRepository,
            NotificationService notificationService) {

        this(housekeepingRepository, roomRepository, userRepository, staffRepository,
                notificationService, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public HousekeepingService(
            HousekeepingRepository housekeepingRepository,
            RoomRepository roomRepository,
            UserRepository userRepository,
            StaffRepository staffRepository,
            NotificationService notificationService,
            InventoryService inventoryService) {

        this.housekeepingRepository = housekeepingRepository;
        this.roomRepository = roomRepository;
        this.userRepository = userRepository;
        this.staffRepository = staffRepository;
        this.notificationService = notificationService;
        this.inventoryService = inventoryService;
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

        Staff staffProfile = resolveHousekeepingStaff(staffUid);
        if (staffProfile == null) {
            throw new IllegalArgumentException("Staff profile not found");
        }

        if (staffProfile.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new IllegalArgumentException("Staff member is not active");
        }

        if (staffProfile.getDepartment() != StaffDepartment.HOUSEKEEPING) {
            throw new IllegalArgumentException("Staff member must belong to HOUSEKEEPING department");
        }

        HousekeepingTask assigned = housekeepingRepository.updateAssignment(
                taskId,
                staffUid,
                HousekeepingTaskStatus.ASSIGNED);

        if (notificationService != null) {
            notificationService.emit(
                    staffUid,
                    NotificationType.HOUSEKEEPING,
                    "Housekeeping task assigned",
                    "You have been assigned a housekeeping task for room " + task.getRoomId() + ".",
                    "/housekeeping/tasks",
                    taskId);
        }

        return assigned;
    }

    public HousekeepingTask startTask(String taskId, String staffUid) {
        return startTask(taskId, staffUid, List.of());
    }

    public HousekeepingTask startTask(
            String taskId,
            String staffUid,
            List<InventoryItemUsage> itemsUsed) {

        HousekeepingTask task = getTaskById(taskId);

        if (task.getStatus() != HousekeepingTaskStatus.ASSIGNED) {
            throw new IllegalArgumentException(
                    "Only assigned tasks can be started");
        }

        if (task.getAssignedTo() == null || !task.getAssignedTo().equals(staffUid)) {
            throw new ForbiddenException(
                    "You are not authorized to start this task");
        }

        Staff staff = resolveHousekeepingStaff(staffUid);
        if (staff == null) {
            throw new ForbiddenException("Staff profile not found");
        }

        if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new ForbiddenException("Staff member is not active");
        }

        List<InventoryItemUsage> usage = itemsUsed == null ? List.of() : itemsUsed;
        if (!usage.isEmpty() && inventoryService == null) {
            throw new IllegalStateException("Inventory usage is unavailable");
        }
        if (usage.stream().anyMatch(used -> used == null || used.itemId() == null
                || used.quantity() == null || !Double.isFinite(used.quantity()))) {
            throw new IllegalArgumentException("Every selected inventory item needs a valid quantity");
        }
        // Check the entire selection before deducting anything so an out of
        // stock item does not leave a partially recorded supply list.
        java.util.Map<String, Double> quantitiesByItem = usage.stream()
                .collect(java.util.stream.Collectors.groupingBy(
                        InventoryItemUsage::itemId,
                        java.util.stream.Collectors.summingDouble(InventoryItemUsage::quantity)));
        for (var selected : quantitiesByItem.entrySet()) {
            var item = inventoryService.getItemById(selected.getKey());
            if (item.getStatus() != com.hotel.hotel_management.inventory.InventoryStatus.ACTIVE) {
                throw new IllegalArgumentException(item.getItemName() + " is inactive and unavailable");
            }
            double available = item.getQuantity() == null ? 0.0 : item.getQuantity();
            if (selected.getValue() <= 0 || selected.getValue() > available) {
                throw new IllegalArgumentException("Insufficient stock for " + item.getItemName()
                        + ": requested " + selected.getValue() + ", available " + available);
            }
        }
        for (var selected : quantitiesByItem.entrySet()) {
            inventoryService.stockOut(new StockOutRequest(selected.getKey(), selected.getValue(),
                    "Housekeeping task " + taskId, "Used for room " + task.getRoomId()), staffUid);
        }

        HousekeepingTask started = housekeepingRepository.updateStatus(
                taskId,
                HousekeepingTaskStatus.IN_PROGRESS,
                Instant.now());
        notifyHousekeepingStatus("Housekeeping started", "Room " + task.getRoomId()
                + " cleaning has started.", taskId);
        return started;
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

        Staff staff = resolveHousekeepingStaff(staffUid);
        if (staff == null) {
            throw new ForbiddenException("Staff profile not found");
        }

        if (staff.getEmploymentStatus() != EmploymentStatus.ACTIVE) {
            throw new ForbiddenException("Staff member is not active");
        }

        HousekeepingTask completedTask = housekeepingRepository.updateStatus(
                taskId,
                HousekeepingTaskStatus.COMPLETED,
                Instant.now());

        List<HousekeepingTask> remainingActive = housekeepingRepository.findByRoomId(task.getRoomId()).stream()
                .filter(t -> !t.getTaskId().equals(taskId))
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.PENDING
                        || t.getStatus() == HousekeepingTaskStatus.ASSIGNED
                        || t.getStatus() == HousekeepingTaskStatus.IN_PROGRESS)
                .toList();

        if (remainingActive.isEmpty()) {
            Room room = roomRepository.findById(task.getRoomId()).orElse(null);
            if (room != null && room.getStatus() == RoomStatus.CLEANING) {
                roomRepository.updateStatus(room.getRoomId(), RoomStatus.AVAILABLE);
            }
        }

        notifyHousekeepingStatus("Housekeeping completed", "Room " + task.getRoomId()
                + " cleaning is complete.", taskId);

        return completedTask;
    }

    private void notifyHousekeepingStatus(String title, String message, String taskId) {
        if (notificationService != null) {
            notificationService.emitToRoles(
                    java.util.EnumSet.of(com.hotel.hotel_management.user.Role.ADMIN,
                            com.hotel.hotel_management.user.Role.MANAGER,
                            com.hotel.hotel_management.user.Role.RECEPTIONIST),
                    NotificationType.HOUSEKEEPING, title, message,
                    "/housekeeping/tasks/" + taskId, taskId);
        }
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
        return housekeepingRepository.findAll().stream()
                .sorted(java.util.Comparator.comparing(HousekeepingTask::getCreatedAt,
                        java.util.Comparator.nullsLast(java.util.Comparator.reverseOrder())))
                .toList();
    }

    /**
     * Aggregated figures for the housekeeping dashboard. Completing a task is
     * what stamps {@code completedAt}, so only COMPLETED tasks can contribute to
     * the daily figure.
     */
    public HousekeepingDashboardResponse getDashboard() {
        List<HousekeepingTask> tasks = housekeepingRepository.findAll();
        LocalDate today = LocalDate.now();

        long total = tasks.size();
        long pending = tasks.stream()
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.PENDING)
                .count();
        long assigned = tasks.stream()
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.ASSIGNED)
                .count();
        long inProgress = tasks.stream()
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.IN_PROGRESS)
                .count();
        long cancelled = tasks.stream()
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.CANCELLED)
                .count();

        long completedToday = tasks.stream()
                .filter(t -> t.getStatus() == HousekeepingTaskStatus.COMPLETED)
                .filter(t -> t.getCompletedAt() != null)
                .filter(t -> today.equals(
                        t.getCompletedAt().atZone(ZoneId.systemDefault()).toLocalDate()))
                .count();

        long roomsNeedingCleaning = roomRepository.findAll().stream()
                .filter(room -> room.getStatus() == RoomStatus.CLEANING)
                .count();

        return new HousekeepingDashboardResponse(
                total, pending, assigned, inProgress, completedToday, cancelled, roomsNeedingCleaning);
    }

    public List<HousekeepingTask> getTasksByRoomId(String roomId) {
        return housekeepingRepository.findByRoomId(roomId);
    }

    public List<HousekeepingTask> getMyTasks(String staffUid) {
        return housekeepingRepository.findByAssignedTo(staffUid);
    }

    private Staff resolveHousekeepingStaff(String staffUid) {
        return staffRepository.findByUserUid(staffUid).orElseGet(() -> {
            var userOpt = userRepository.findByUid(staffUid);
            if (userOpt.isPresent()) {
                var user = userOpt.get();
                if ("HOUSEKEEPING".equalsIgnoreCase(user.getRole())) {
                    Staff staff = new Staff();
                    staff.setStaffId(UUID.randomUUID().toString());
                    staff.setUserUid(user.getUid());
                    String shortUid = user.getUid() != null && user.getUid().length() >= 6
                            ? user.getUid().substring(0, 6).toUpperCase()
                            : UUID.randomUUID().toString().substring(0, 6).toUpperCase();
                    staff.setEmployeeId("EMP-" + shortUid);
                    staff.setDepartment(StaffDepartment.HOUSEKEEPING);
                    staff.setPosition("Housekeeper");
                    staff.setHireDate(java.time.LocalDate.now());
                    staff.setSalary(0.0);
                    staff.setEmploymentStatus(user.isEnabled() ? EmploymentStatus.ACTIVE : EmploymentStatus.INACTIVE);
                    staff.setEmergencyContact(user.getPhone());
                    staff.setCreatedAt(Instant.now());
                    staff.setUpdatedAt(Instant.now());
                    try {
                        return staffRepository.save(staff);
                    } catch (Exception e) {
                        return staff;
                    }
                }
            }
            return null;
        });
    }
}

