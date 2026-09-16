package com.hotel.hotel_management.maintenance;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.finance.FinanceService;
import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
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

import java.time.Instant;
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
    private MaintenanceService maintenanceService;

    @BeforeEach
    void setUp() {
        maintenanceRepository = mock(MaintenanceRepository.class);
        roomRepository = mock(RoomRepository.class);
        userRepository = mock(UserRepository.class);
        housekeepingRepository = mock(HousekeepingRepository.class);
        staffRepository = mock(StaffRepository.class);
        financeService = mock(FinanceService.class);

        maintenanceService = new MaintenanceService(
                maintenanceRepository,
                roomRepository,
                userRepository,
                housekeepingRepository,
                staffRepository,
                financeService
        );

        Staff defaultStaff = new Staff();
        defaultStaff.setUserUid("staff-1");
        defaultStaff.setDepartment(StaffDepartment.MAINTENANCE);
        defaultStaff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid(anyString())).thenReturn(Optional.of(defaultStaff));
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
        when(maintenanceRepository.updateStatus(eq("task-1"), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(10000.0)))
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
        when(maintenanceRepository.updateStatus(eq("task-2"), eq(MaintenanceStatus.COMPLETED), any(Instant.class), eq(0.0)))
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
}

