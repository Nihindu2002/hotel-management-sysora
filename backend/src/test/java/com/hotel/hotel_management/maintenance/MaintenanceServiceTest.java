package com.hotel.hotel_management.maintenance;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.notification.NotificationService;
import com.hotel.hotel_management.notification.NotificationType;
import com.hotel.hotel_management.reservation.Reservation;
import com.hotel.hotel_management.reservation.ReservationRepository;
import com.hotel.hotel_management.reservation.ReservationStatus;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.staff.EmploymentStatus;
import com.hotel.hotel_management.staff.Staff;
import com.hotel.hotel_management.staff.StaffDepartment;
import com.hotel.hotel_management.staff.StaffRepository;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MaintenanceServiceTest {

    private MaintenanceRepository maintenanceRepository;
    private RoomRepository roomRepository;
    private UserRepository userRepository;
    private HousekeepingRepository housekeepingRepository;
    private StaffRepository staffRepository;
    private FinanceService financeService;
    private ReservationRepository reservationRepository;
    private NotificationService notificationService;
    private MaintenanceService maintenanceService;

    @BeforeEach
    void setUp() {
        maintenanceRepository = mock(MaintenanceRepository.class);
        roomRepository = mock(RoomRepository.class);
        userRepository = mock(UserRepository.class);
        housekeepingRepository = mock(HousekeepingRepository.class);
        staffRepository = mock(StaffRepository.class);
        financeService = mock(FinanceService.class);
        reservationRepository = mock(ReservationRepository.class);
        notificationService = mock(NotificationService.class);

        maintenanceService = new MaintenanceService(
                maintenanceRepository,
                roomRepository,
                userRepository,
                housekeepingRepository,
                staffRepository,
                financeService,
                reservationRepository,
                notificationService
        );

        Staff defaultStaff = new Staff();
        defaultStaff.setUserUid("staff-1");
        defaultStaff.setDepartment(StaffDepartment.MAINTENANCE);
        defaultStaff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid(anyString())).thenReturn(Optional.of(defaultStaff));
    }

    private Room room(String roomId, RoomStatus status) {
        Room room = new Room();
        room.setRoomId(roomId);
        room.setRoomNumber("101");
        room.setStatus(status);
        return room;
    }

    private MaintenanceTask task(
            String taskId,
            String roomId,
            MaintenanceStatus status,
            String assignedTo) {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId(taskId);
        task.setRoomId(roomId);
        task.setStatus(status);
        task.setAssignedTo(assignedTo);
        return task;
    }

    @Test
    void completeTask_Success_WithCost_CreatesFinanceExpense() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("task-1");
        task.setRoomId("room-101");
        task.setStatus(MaintenanceStatus.IN_PROGRESS);
        task.setAssignedTo("staff-1");

        MaintenanceTask completedTask = new MaintenanceTask();
        completedTask.setTaskId("task-1");
        completedTask.setRoomId("room-101");
        completedTask.setStatus(MaintenanceStatus.COMPLETED);
        completedTask.setAssignedTo("staff-1");
        completedTask.setActualCost(10000.0);

        when(maintenanceRepository.findById("task-1")).thenReturn(Optional.of(task));
        when(maintenanceRepository.updateStatus(eq("task-1"), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(10000.0), any()))
                .thenReturn(completedTask);
        when(maintenanceRepository.findByRoomId("room-101")).thenReturn(List.of(completedTask));
        when(housekeepingRepository.findByRoomId("room-101")).thenReturn(Collections.emptyList());

        MaintenanceTask result = maintenanceService.completeTask("task-1", "staff-1", 10000.0);

        assertNotNull(result);
        assertEquals(MaintenanceStatus.COMPLETED, result.getStatus());
        assertEquals(10000.0, result.getActualCost());
        verify(financeService).recordMaintenanceExpense(completedTask, "staff-1");
    }

    @Test
    void completeTask_Success_ZeroCost_DoesNotCreateFinanceExpense() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("task-2");
        task.setRoomId("room-102");
        task.setStatus(MaintenanceStatus.IN_PROGRESS);
        task.setAssignedTo("staff-2");

        MaintenanceTask completedTask = new MaintenanceTask();
        completedTask.setTaskId("task-2");
        completedTask.setRoomId("room-102");
        completedTask.setStatus(MaintenanceStatus.COMPLETED);
        completedTask.setAssignedTo("staff-2");
        completedTask.setActualCost(0.0);

        when(maintenanceRepository.findById("task-2")).thenReturn(Optional.of(task));
        when(maintenanceRepository.updateStatus(eq("task-2"), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(0.0), any()))
                .thenReturn(completedTask);
        when(maintenanceRepository.findByRoomId("room-102")).thenReturn(List.of(completedTask));
        when(housekeepingRepository.findByRoomId("room-102")).thenReturn(Collections.emptyList());

        MaintenanceTask result = maintenanceService.completeTask("task-2", "staff-2", 0.0);

        assertNotNull(result);
        assertEquals(MaintenanceStatus.COMPLETED, result.getStatus());
        verifyNoInteractions(financeService);
    }

    @Test
    void completeTask_FailsIfActualCostNegative() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("task-neg");
        task.setStatus(MaintenanceStatus.IN_PROGRESS);
        task.setAssignedTo("staff-1");

        when(maintenanceRepository.findById("task-neg")).thenReturn(Optional.of(task));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.completeTask("task-neg", "staff-1", -500.0)
        );
        assertEquals("Actual cost cannot be negative", ex.getMessage());
    }

    @Test
    void updateTaskCost_Success_UpdatesExistingFinanceTransaction() {
        MaintenanceTask completedTask = new MaintenanceTask();
        completedTask.setTaskId("task-update");
        completedTask.setRoomId("room-103");
        completedTask.setStatus(MaintenanceStatus.COMPLETED);
        completedTask.setActualCost(10000.0);

        MaintenanceTask updatedTask = new MaintenanceTask();
        updatedTask.setTaskId("task-update");
        updatedTask.setRoomId("room-103");
        updatedTask.setStatus(MaintenanceStatus.COMPLETED);
        updatedTask.setActualCost(12000.0);

        when(maintenanceRepository.findById("task-update")).thenReturn(Optional.of(completedTask));
        when(maintenanceRepository.updateCost("task-update", 12000.0)).thenReturn(updatedTask);

        MaintenanceTask result = maintenanceService.updateTaskCost("task-update", 12000.0, "manager-uid");

        assertNotNull(result);
        assertEquals(12000.0, result.getActualCost());
        verify(financeService).updateMaintenanceExpense(updatedTask, 12000.0, "manager-uid");
    }

    @Test
    void cancelTask_BeforeCompletion_NoFinanceExpense() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("task-cancel");
        task.setRoomId("room-104");
        task.setStatus(MaintenanceStatus.PENDING);
        task.setActualCost(null);

        MaintenanceTask cancelledTask = new MaintenanceTask();
        cancelledTask.setTaskId("task-cancel");
        cancelledTask.setRoomId("room-104");
        cancelledTask.setStatus(MaintenanceStatus.CANCELLED);

        when(maintenanceRepository.findById("task-cancel")).thenReturn(Optional.of(task));
        when(maintenanceRepository.updateStatus(eq("task-cancel"), eq(MaintenanceStatus.CANCELLED), isNull(), isNull()))
                .thenReturn(cancelledTask);
        when(maintenanceRepository.findByRoomId("room-104")).thenReturn(List.of(cancelledTask));
        when(housekeepingRepository.findByRoomId("room-104")).thenReturn(Collections.emptyList());

        MaintenanceTask result = maintenanceService.cancelTask("task-cancel");

        assertNotNull(result);
        assertEquals(MaintenanceStatus.CANCELLED, result.getStatus());
        verify(financeService).cancelMaintenanceExpense("task-cancel");
    }

    @Test
    void assignTask_Success_ActiveMaintenanceStaff() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-m")).thenReturn(Optional.of(staff));

        MaintenanceTask assignedTask = new MaintenanceTask();
        assignedTask.setTaskId("m-1");
        assignedTask.setAssignedTo("staff-m");
        assignedTask.setStatus(MaintenanceStatus.ASSIGNED);
        when(maintenanceRepository.updateAssignment("m-1", "staff-m", MaintenanceStatus.ASSIGNED))
                .thenReturn(assignedTask);

        MaintenanceTask result = maintenanceService.assignTask("m-1", "staff-m");

        assertNotNull(result);
        assertEquals("staff-m", result.getAssignedTo());
        assertEquals(MaintenanceStatus.ASSIGNED, result.getStatus());
    }

    @Test
    void assignTask_NotifiesTheAssignedStaffMember() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-notify");
        task.setRoomId("room-9");
        task.setDescription("Leaking tap");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-notify")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-notify");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-notify")).thenReturn(Optional.of(staff));

        when(maintenanceRepository.updateAssignment("m-notify", "staff-notify", MaintenanceStatus.ASSIGNED))
                .thenReturn(task);

        maintenanceService.assignTask("m-notify", "staff-notify");

        verify(notificationService).emit(
                eq("staff-notify"),
                eq(NotificationType.MAINTENANCE),
                eq("Maintenance task assigned"),
                contains("room-9"),
                eq("/maintenance/tasks"),
                eq("m-notify"));
    }

    @Test
    void assignTask_Fails_WhenStaffNotFound() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));
        when(staffRepository.findByUserUid("unknown-staff")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.assignTask("m-1", "unknown-staff")
        );
        assertEquals("Staff profile not found", ex.getMessage());
    }

    @Test
    void assignTask_Fails_WhenStaffInactive() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ON_LEAVE);
        when(staffRepository.findByUserUid("staff-m")).thenReturn(Optional.of(staff));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.assignTask("m-1", "staff-m")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void assignTask_Fails_WhenStaffWrongDepartment() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-h")).thenReturn(Optional.of(staff));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.assignTask("m-1", "staff-h")
        );
        assertEquals("Staff member must belong to MAINTENANCE department", ex.getMessage());
    }

    @Test
    void startTask_Success_ActiveAssignedStaff() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.ASSIGNED);
        task.setAssignedTo("staff-m");
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-m")).thenReturn(Optional.of(staff));

        MaintenanceTask inProgressTask = new MaintenanceTask();
        inProgressTask.setTaskId("m-1");
        inProgressTask.setStatus(MaintenanceStatus.IN_PROGRESS);
        when(maintenanceRepository.updateStatus(eq("m-1"), eq(MaintenanceStatus.IN_PROGRESS), any(Instant.class)))
                .thenReturn(inProgressTask);

        MaintenanceTask result = maintenanceService.startTask("m-1", "staff-m");

        assertNotNull(result);
        assertEquals(MaintenanceStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    void startTask_Fails_WhenStaffInactive() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.ASSIGNED);
        task.setAssignedTo("staff-m");
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ON_LEAVE);
        when(staffRepository.findByUserUid("staff-m")).thenReturn(Optional.of(staff));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> maintenanceService.startTask("m-1", "staff-m")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void startTask_Fails_WhenStaffNotAssigned() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.ASSIGNED);
        task.setAssignedTo("staff-m");
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> maintenanceService.startTask("m-1", "different-staff")
        );
        assertEquals("You are not authorized to start this task", ex.getMessage());
    }

    @Test
    void completeTask_Fails_WhenStaffInactive() {
        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-1");
        task.setStatus(MaintenanceStatus.IN_PROGRESS);
        task.setAssignedTo("staff-m");
        when(maintenanceRepository.findById("m-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.TERMINATED);
        when(staffRepository.findByUserUid("staff-m")).thenReturn(Optional.of(staff));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> maintenanceService.completeTask("m-1", "staff-m", 100.0)
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    // ── Room status on creation ──────────────────────────────────────────────

    @Test
    void createTask_SetsRoomToMaintenance() {
        when(roomRepository.findById("room-101"))
                .thenReturn(Optional.of(room("room-101", RoomStatus.AVAILABLE)));
        when(maintenanceRepository.save(any(MaintenanceTask.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        CreateMaintenanceTaskRequest request = new CreateMaintenanceTaskRequest(
                "room-101",
                MaintenanceIssueType.PLUMBING,
                MaintenancePriority.HIGH,
                "Leaking tap");

        MaintenanceTask result = maintenanceService.createTask(request, "reporter-1");

        assertEquals(MaintenanceStatus.PENDING, result.getStatus());
        assertEquals("reporter-1", result.getReportedBy());
        assertNull(result.getAssignedTo());
        verify(roomRepository).updateStatus("room-101", RoomStatus.MAINTENANCE);
    }

    // ── Room status resolution after maintenance ends ─────────────────────────

    private MaintenanceTask stubCompletion(String taskId, String roomId, RoomStatus before) {
        MaintenanceTask inProgress = task(taskId, roomId, MaintenanceStatus.IN_PROGRESS, "staff-1");
        MaintenanceTask completed = task(taskId, roomId, MaintenanceStatus.COMPLETED, "staff-1");
        completed.setActualCost(0.0);

        when(maintenanceRepository.findById(taskId)).thenReturn(Optional.of(inProgress));
        when(maintenanceRepository.updateStatus(
                eq(taskId), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(0.0), any()))
                .thenReturn(completed);
        when(maintenanceRepository.findByRoomId(roomId)).thenReturn(List.of(completed));
        when(roomRepository.findById(roomId)).thenReturn(Optional.of(room(roomId, before)));
        return completed;
    }

    @Test
    void completeTask_RoomBecomesAvailable_WhenNothingElseApplies() {
        stubCompletion("t-1", "room-101", RoomStatus.MAINTENANCE);
        when(housekeepingRepository.findByRoomId("room-101")).thenReturn(Collections.emptyList());
        when(reservationRepository.findByRoomId("room-101")).thenReturn(Collections.emptyList());

        maintenanceService.completeTask("t-1", "staff-1", 0.0);

        verify(roomRepository).updateStatus("room-101", RoomStatus.AVAILABLE);
    }

    @Test
    void completeTask_RoomBecomesCleaning_WhenHousekeepingTaskActive() {
        stubCompletion("t-2", "room-102", RoomStatus.MAINTENANCE);

        HousekeepingTask cleaning = new HousekeepingTask();
        cleaning.setTaskId("hk-1");
        cleaning.setRoomId("room-102");
        cleaning.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findByRoomId("room-102")).thenReturn(List.of(cleaning));
        when(reservationRepository.findByRoomId("room-102")).thenReturn(Collections.emptyList());

        maintenanceService.completeTask("t-2", "staff-1", 0.0);

        verify(roomRepository).updateStatus("room-102", RoomStatus.CLEANING);
        verify(roomRepository, never()).updateStatus("room-102", RoomStatus.AVAILABLE);
    }

    @Test
    void completeTask_RoomBecomesOccupied_WhenGuestCheckedIn() {
        stubCompletion("t-3", "room-103", RoomStatus.MAINTENANCE);

        Reservation checkedIn = new Reservation();
        checkedIn.setReservationId("res-1");
        checkedIn.setRoomId("room-103");
        checkedIn.setStatus(ReservationStatus.CHECKED_IN);
        checkedIn.setCheckInDate(LocalDate.now().minusDays(1));
        checkedIn.setCheckOutDate(LocalDate.now().plusDays(1));
        when(reservationRepository.findByRoomId("room-103")).thenReturn(List.of(checkedIn));
        when(housekeepingRepository.findByRoomId("room-103")).thenReturn(Collections.emptyList());

        maintenanceService.completeTask("t-3", "staff-1", 0.0);

        verify(roomRepository).updateStatus("room-103", RoomStatus.OCCUPIED);
        verify(roomRepository, never()).updateStatus("room-103", RoomStatus.AVAILABLE);
    }

    @Test
    void completeTask_RoomBecomesReserved_WhenUpcomingReservation() {
        stubCompletion("t-4", "room-104", RoomStatus.MAINTENANCE);

        Reservation upcoming = new Reservation();
        upcoming.setReservationId("res-2");
        upcoming.setRoomId("room-104");
        upcoming.setStatus(ReservationStatus.CONFIRMED);
        upcoming.setCheckInDate(LocalDate.now().plusDays(2));
        upcoming.setCheckOutDate(LocalDate.now().plusDays(4));
        when(reservationRepository.findByRoomId("room-104")).thenReturn(List.of(upcoming));
        when(housekeepingRepository.findByRoomId("room-104")).thenReturn(Collections.emptyList());

        maintenanceService.completeTask("t-4", "staff-1", 0.0);

        verify(roomRepository).updateStatus("room-104", RoomStatus.RESERVED);
        verify(roomRepository, never()).updateStatus("room-104", RoomStatus.AVAILABLE);
    }

    @Test
    void completeTask_LeavesRoomInMaintenance_WhenAnotherTaskStillActive() {
        stubCompletion("t-5", "room-105", RoomStatus.MAINTENANCE);

        MaintenanceTask otherActive = task("t-6", "room-105", MaintenanceStatus.IN_PROGRESS, "staff-2");
        MaintenanceTask completed = task("t-5", "room-105", MaintenanceStatus.COMPLETED, "staff-1");
        when(maintenanceRepository.findByRoomId("room-105"))
                .thenReturn(List.of(completed, otherActive));

        maintenanceService.completeTask("t-5", "staff-1", 0.0);

        verify(roomRepository, never()).updateStatus(anyString(), any(RoomStatus.class));
    }

    // ── Invalid status transitions ───────────────────────────────────────────

    @Test
    void startTask_Fails_WhenTaskIsPending() {
        when(maintenanceRepository.findById("m-2"))
                .thenReturn(Optional.of(task("m-2", "room-1", MaintenanceStatus.PENDING, "staff-1")));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.startTask("m-2", "staff-1")
        );
        assertEquals("Only assigned tasks can be started", ex.getMessage());
    }

    @Test
    void completeTask_Fails_WhenTaskNotInProgress() {
        when(maintenanceRepository.findById("m-3"))
                .thenReturn(Optional.of(task("m-3", "room-1", MaintenanceStatus.ASSIGNED, "staff-1")));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.completeTask("m-3", "staff-1", 50.0)
        );
        assertEquals("Only in-progress tasks can be completed", ex.getMessage());
        verifyNoInteractions(financeService);
    }

    @Test
    void assignTask_Fails_WhenTaskAlreadyCompleted() {
        when(maintenanceRepository.findById("m-4"))
                .thenReturn(Optional.of(task("m-4", "room-1", MaintenanceStatus.COMPLETED, "staff-1")));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.assignTask("m-4", "staff-1")
        );
        assertEquals("Completed or cancelled tasks cannot be assigned", ex.getMessage());
    }

    @Test
    void cancelTask_Fails_WhenTaskAlreadyCompleted() {
        when(maintenanceRepository.findById("m-5"))
                .thenReturn(Optional.of(task("m-5", "room-1", MaintenanceStatus.COMPLETED, "staff-1")));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.cancelTask("m-5")
        );
        assertEquals("Completed or cancelled tasks cannot be cancelled", ex.getMessage());
        verifyNoInteractions(financeService);
    }

    // ── Completion information ───────────────────────────────────────────────

    @Test
    void completeTask_StoresCompletionNotes() {
        MaintenanceTask inProgress = task("t-7", "room-107", MaintenanceStatus.IN_PROGRESS, "staff-1");
        MaintenanceTask completed = task("t-7", "room-107", MaintenanceStatus.COMPLETED, "staff-1");
        completed.setActualCost(2500.0);
        completed.setCompletionNotes("Replaced the mixer tap cartridge.");

        when(maintenanceRepository.findById("t-7")).thenReturn(Optional.of(inProgress));
        when(maintenanceRepository.updateStatus(
                eq("t-7"), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(2500.0),
                eq("Replaced the mixer tap cartridge.")))
                .thenReturn(completed);
        when(maintenanceRepository.findByRoomId("room-107")).thenReturn(List.of(completed));
        when(roomRepository.findById("room-107"))
                .thenReturn(Optional.of(room("room-107", RoomStatus.MAINTENANCE)));
        when(housekeepingRepository.findByRoomId("room-107")).thenReturn(Collections.emptyList());
        when(reservationRepository.findByRoomId("room-107")).thenReturn(Collections.emptyList());

        MaintenanceTask result = maintenanceService.completeTask(
                "t-7", "staff-1", 2500.0, "Replaced the mixer tap cartridge.");

        assertEquals("Replaced the mixer tap cartridge.", result.getCompletionNotes());
        verify(financeService).recordMaintenanceExpense(completed, "staff-1");
    }

    @Test
    void updateTaskCost_AfterCompletion_DelegatesToExistingFinanceRecord() {
        MaintenanceTask completed = task("t-8", "room-108", MaintenanceStatus.COMPLETED, "staff-1");
        completed.setActualCost(1000.0);

        MaintenanceTask updated = task("t-8", "room-108", MaintenanceStatus.COMPLETED, "staff-1");
        updated.setActualCost(1750.0);

        when(maintenanceRepository.findById("t-8")).thenReturn(Optional.of(completed));
        when(maintenanceRepository.updateCost("t-8", 1750.0)).thenReturn(updated);

        MaintenanceTask result = maintenanceService.updateTaskCost("t-8", 1750.0, "manager-1");

        assertEquals(1750.0, result.getActualCost());
        // Must update the existing transaction rather than record a second expense.
        verify(financeService).updateMaintenanceExpense(updated, 1750.0, "manager-1");
        verify(financeService, never()).recordMaintenanceExpense(any(), anyString());
    }

    // ── Filtering and dashboard aggregation ──────────────────────────────────

    @Test
    void getTasksFiltered_AppliesEverySuppliedFilter() {
        MaintenanceTask match = task("f-1", "room-1", MaintenanceStatus.PENDING, null);
        match.setPriority(MaintenancePriority.URGENT);
        match.setIssueType(MaintenanceIssueType.ELECTRICAL);

        MaintenanceTask wrongStatus = task("f-2", "room-1", MaintenanceStatus.COMPLETED, null);
        wrongStatus.setPriority(MaintenancePriority.URGENT);
        wrongStatus.setIssueType(MaintenanceIssueType.ELECTRICAL);

        MaintenanceTask wrongPriority = task("f-3", "room-1", MaintenanceStatus.PENDING, null);
        wrongPriority.setPriority(MaintenancePriority.LOW);
        wrongPriority.setIssueType(MaintenanceIssueType.ELECTRICAL);

        when(maintenanceRepository.findAll())
                .thenReturn(List.of(match, wrongStatus, wrongPriority));

        List<MaintenanceTask> result = maintenanceService.getTasksFiltered(
                MaintenanceStatus.PENDING,
                MaintenancePriority.URGENT,
                MaintenanceIssueType.ELECTRICAL,
                null,
                "room-1");

        assertEquals(1, result.size());
        assertEquals("f-1", result.get(0).getTaskId());
    }

    @Test
    void getTasksFiltered_ReturnsEverything_WhenNoFiltersSupplied() {
        when(maintenanceRepository.findAll())
                .thenReturn(List.of(
                        task("a", "room-1", MaintenanceStatus.PENDING, null),
                        task("b", "room-2", MaintenanceStatus.COMPLETED, "staff-1")));

        assertEquals(2, maintenanceService.getTasksFiltered(null, null, null, null, null).size());
    }

    @Test
    void getDashboard_AggregatesStatusesCostsAndTodayCompletions() {
        MaintenanceTask pending = task("d-1", "room-1", MaintenanceStatus.PENDING, null);
        pending.setPriority(MaintenancePriority.URGENT);

        MaintenanceTask assigned = task("d-2", "room-2", MaintenanceStatus.ASSIGNED, "staff-1");
        assigned.setPriority(MaintenancePriority.HIGH);

        MaintenanceTask inProgress = task("d-3", "room-3", MaintenanceStatus.IN_PROGRESS, "staff-1");
        inProgress.setPriority(MaintenancePriority.LOW);

        MaintenanceTask completedToday = task("d-4", "room-4", MaintenanceStatus.COMPLETED, "staff-1");
        completedToday.setPriority(MaintenancePriority.LOW);
        completedToday.setCompletedAt(Instant.now());
        completedToday.setActualCost(1500.0);

        MaintenanceTask completedEarlier = task("d-5", "room-5", MaintenanceStatus.COMPLETED, "staff-1");
        completedEarlier.setCompletedAt(Instant.now().minusSeconds(60 * 60 * 48));
        completedEarlier.setActualCost(500.0);

        MaintenanceTask cancelled = task("d-6", "room-6", MaintenanceStatus.CANCELLED, null);
        cancelled.setPriority(MaintenancePriority.HIGH);

        when(maintenanceRepository.findAll()).thenReturn(List.of(
                pending, assigned, inProgress, completedToday, completedEarlier, cancelled));

        MaintenanceDashboardResponse stats = maintenanceService.getDashboard();

        assertEquals(1, stats.pendingTasks());
        assertEquals(1, stats.assignedTasks());
        assertEquals(1, stats.inProgressTasks());
        assertEquals(1, stats.completedToday());
        assertEquals(1, stats.cancelledTasks());
        assertEquals(2, stats.highPriorityActiveTasks());
        assertEquals(6, stats.totalTasks());
        assertEquals(2000.0, stats.totalMaintenanceCost());
    }
}

