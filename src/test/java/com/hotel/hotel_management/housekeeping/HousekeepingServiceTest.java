package com.hotel.hotel_management.housekeeping;

import com.hotel.hotel_management.common.ForbiddenException;
import com.hotel.hotel_management.room.Room;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.room.RoomStatus;
import com.hotel.hotel_management.staff.EmploymentStatus;
import com.hotel.hotel_management.staff.Staff;
import com.hotel.hotel_management.staff.StaffDepartment;
import com.hotel.hotel_management.staff.StaffRepository;
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

class HousekeepingServiceTest {

    private HousekeepingRepository housekeepingRepository;
    private RoomRepository roomRepository;
    private UserRepository userRepository;
    private StaffRepository staffRepository;
    private HousekeepingService housekeepingService;

    @BeforeEach
    void setUp() {
        housekeepingRepository = mock(HousekeepingRepository.class);
        roomRepository = mock(RoomRepository.class);
        userRepository = mock(UserRepository.class);
        staffRepository = mock(StaffRepository.class);

        housekeepingService = new HousekeepingService(
                housekeepingRepository,
                roomRepository,
                userRepository,
                staffRepository
        );

        Staff defaultStaff = new Staff();
        defaultStaff.setUserUid("staff-h-1");
        defaultStaff.setDepartment(StaffDepartment.HOUSEKEEPING);
        defaultStaff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid(anyString())).thenReturn(Optional.of(defaultStaff));
    }

    @Test
    void createTask_Success() {
        Room room = new Room();
        room.setRoomId("room-101");
        when(roomRepository.findById("room-101")).thenReturn(Optional.of(room));

        when(housekeepingRepository.save(any(HousekeepingTask.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        CreateHousekeepingTaskRequest request = new CreateHousekeepingTaskRequest(
                "room-101",
                HousekeepingTaskType.REGULAR_CLEANING,
                HousekeepingTaskPriority.MEDIUM,
                "Daily clean required"
        );

        HousekeepingTask task = housekeepingService.createTask(request);

        assertNotNull(task);
        assertEquals("room-101", task.getRoomId());
        assertEquals(HousekeepingTaskType.REGULAR_CLEANING, task.getTaskType());
        assertEquals(HousekeepingTaskStatus.PENDING, task.getStatus());
        assertNull(task.getAssignedTo());
    }

    @Test
    void createTask_CheckoutCleaning_FailsWhenActiveTaskExists() {
        Room room = new Room();
        room.setRoomId("room-101");
        when(roomRepository.findById("room-101")).thenReturn(Optional.of(room));

        HousekeepingTask activeTask = new HousekeepingTask();
        activeTask.setTaskId("active-1");
        activeTask.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        when(housekeepingRepository.findByRoomId("room-101")).thenReturn(List.of(activeTask));

        CreateHousekeepingTaskRequest request = new CreateHousekeepingTaskRequest(
                "room-101",
                HousekeepingTaskType.CHECKOUT_CLEANING,
                HousekeepingTaskPriority.HIGH,
                "Post checkout clean"
        );

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.createTask(request)
        );
        assertEquals("Room already has an active housekeeping task", ex.getMessage());
    }

    @Test
    void assignTask_Success_ActiveHousekeepingStaff() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        HousekeepingTask assignedTask = new HousekeepingTask();
        assignedTask.setTaskId("h-task-1");
        assignedTask.setAssignedTo("staff-h-1");
        assignedTask.setStatus(HousekeepingTaskStatus.ASSIGNED);
        when(housekeepingRepository.updateAssignment("h-task-1", "staff-h-1", HousekeepingTaskStatus.ASSIGNED))
                .thenReturn(assignedTask);

        HousekeepingTask result = housekeepingService.assignTask("h-task-1", "staff-h-1");

        assertNotNull(result);
        assertEquals("staff-h-1", result.getAssignedTo());
        assertEquals(HousekeepingTaskStatus.ASSIGNED, result.getStatus());
    }

    @Test
    void assignTask_Fails_WhenStaffNotFound() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));
        when(staffRepository.findByUserUid("unknown-staff")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.assignTask("h-task-1", "unknown-staff")
        );
        assertEquals("Staff profile not found", ex.getMessage());
    }

    @Test
    void assignTask_Fails_WhenStaffInactive() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ON_LEAVE);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.assignTask("h-task-1", "staff-h-1")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void assignTask_Fails_WhenStaffWrongDepartment() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-m-1");
        staff.setDepartment(StaffDepartment.MAINTENANCE);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-m-1")).thenReturn(Optional.of(staff));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.assignTask("h-task-1", "staff-m-1")
        );
        assertEquals("Staff member must belong to HOUSEKEEPING department", ex.getMessage());
    }

    @Test
    void assignTask_Fails_WhenTaskCompletedOrCancelled() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-comp");
        task.setStatus(HousekeepingTaskStatus.COMPLETED);
        when(housekeepingRepository.findById("h-task-comp")).thenReturn(Optional.of(task));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.assignTask("h-task-comp", "staff-h-1")
        );
        assertEquals("Completed or cancelled tasks cannot be assigned", ex.getMessage());
    }

    @Test
    void startTask_Success_ActiveAssignedStaff() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.ASSIGNED);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        HousekeepingTask inProgressTask = new HousekeepingTask();
        inProgressTask.setTaskId("h-task-1");
        inProgressTask.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        when(housekeepingRepository.updateStatus(eq("h-task-1"), eq(HousekeepingTaskStatus.IN_PROGRESS), any(Instant.class)))
                .thenReturn(inProgressTask);

        HousekeepingTask result = housekeepingService.startTask("h-task-1", "staff-h-1");

        assertNotNull(result);
        assertEquals(HousekeepingTaskStatus.IN_PROGRESS, result.getStatus());
    }

    @Test
    void startTask_Fails_WhenStaffInactive() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.ASSIGNED);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ON_LEAVE);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> housekeepingService.startTask("h-task-1", "staff-h-1")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void startTask_Fails_WhenStaffNotAssigned() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.ASSIGNED);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> housekeepingService.startTask("h-task-1", "different-user")
        );
        assertEquals("You are not authorized to start this task", ex.getMessage());
    }

    @Test
    void completeTask_Success_ActiveAssignedStaff_UpdatesRoomToAvailable() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setRoomId("room-101");
        task.setTaskType(HousekeepingTaskType.CHECKOUT_CLEANING);
        task.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.ACTIVE);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        HousekeepingTask completedTask = new HousekeepingTask();
        completedTask.setTaskId("h-task-1");
        completedTask.setRoomId("room-101");
        completedTask.setTaskType(HousekeepingTaskType.CHECKOUT_CLEANING);
        completedTask.setStatus(HousekeepingTaskStatus.COMPLETED);
        when(housekeepingRepository.updateStatus(eq("h-task-1"), eq(HousekeepingTaskStatus.COMPLETED), any(Instant.class)))
                .thenReturn(completedTask);

        Room room = new Room();
        room.setRoomId("room-101");
        room.setStatus(RoomStatus.CLEANING);
        when(roomRepository.findById("room-101")).thenReturn(Optional.of(room));

        HousekeepingTask result = housekeepingService.completeTask("h-task-1", "staff-h-1");

        assertNotNull(result);
        assertEquals(HousekeepingTaskStatus.COMPLETED, result.getStatus());
        verify(roomRepository).updateStatus("room-101", RoomStatus.AVAILABLE);
    }

    @Test
    void completeTask_Fails_WhenStaffInactive() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        Staff staff = new Staff();
        staff.setUserUid("staff-h-1");
        staff.setDepartment(StaffDepartment.HOUSEKEEPING);
        staff.setEmploymentStatus(EmploymentStatus.TERMINATED);
        when(staffRepository.findByUserUid("staff-h-1")).thenReturn(Optional.of(staff));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> housekeepingService.completeTask("h-task-1", "staff-h-1")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void completeTask_Fails_WhenNotAssignedStaff() {
        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("h-task-1");
        task.setStatus(HousekeepingTaskStatus.IN_PROGRESS);
        task.setAssignedTo("staff-h-1");
        when(housekeepingRepository.findById("h-task-1")).thenReturn(Optional.of(task));

        ForbiddenException ex = assertThrows(
                ForbiddenException.class,
                () -> housekeepingService.completeTask("h-task-1", "other-staff")
        );
        assertEquals("You are not authorized to complete this task", ex.getMessage());
    }
}
