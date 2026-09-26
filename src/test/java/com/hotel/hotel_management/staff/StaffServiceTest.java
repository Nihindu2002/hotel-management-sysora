package com.hotel.hotel_management.staff;

import com.hotel.hotel_management.housekeeping.HousekeepingRepository;
import com.hotel.hotel_management.housekeeping.HousekeepingService;
import com.hotel.hotel_management.housekeeping.HousekeepingTask;
import com.hotel.hotel_management.housekeeping.HousekeepingTaskStatus;
import com.hotel.hotel_management.maintenance.MaintenanceRepository;
import com.hotel.hotel_management.maintenance.MaintenanceService;
import com.hotel.hotel_management.maintenance.MaintenanceStatus;
import com.hotel.hotel_management.maintenance.MaintenanceTask;
import com.hotel.hotel_management.room.RoomRepository;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class StaffServiceTest {

    private StaffRepository staffRepository;
    private UserRepository userRepository;
    private StaffService staffService;

    @BeforeEach
    void setUp() {
        staffRepository = mock(StaffRepository.class);
        userRepository = mock(UserRepository.class);
        staffService = new StaffService(staffRepository, userRepository);
    }

    @Test
    void createStaff_Success() {
        CreateStaffRequest request = new CreateStaffRequest(
                "user-1",
                "EMP-001",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                75000.0,
                "0771234567"
        );

        User user = new User();
        user.setUid("user-1");
        user.setRole(Role.HOUSEKEEPING.name());

        when(userRepository.findByUid("user-1")).thenReturn(Optional.of(user));
        when(staffRepository.findByUserUid("user-1")).thenReturn(Optional.empty());
        when(staffRepository.findByEmployeeId("EMP-001")).thenReturn(Optional.empty());
        when(staffRepository.save(any(Staff.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Staff created = staffService.createStaff(request);

        assertNotNull(created);
        assertEquals("user-1", created.getUserUid());
        assertEquals("EMP-001", created.getEmployeeId());
        assertEquals(StaffDepartment.HOUSEKEEPING, created.getDepartment());
        assertEquals(EmploymentStatus.ACTIVE, created.getEmploymentStatus());
        assertNotNull(created.getStaffId());
        assertNotNull(created.getCreatedAt());
    }

    @Test
    void createStaff_FailsWhenUserNotFound() {
        CreateStaffRequest request = new CreateStaffRequest(
                "non-existent-user",
                "EMP-001",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                75000.0,
                "0771234567"
        );

        when(userRepository.findByUid("non-existent-user")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> staffService.createStaff(request)
        );
        assertEquals("User not found", ex.getMessage());
    }

    @Test
    void createStaff_FailsWhenUserHasRetiredCustomerRole() {
        CreateStaffRequest request = new CreateStaffRequest(
                "user-customer",
                "EMP-001",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                75000.0,
                "0771234567"
        );

        User user = new User();
        user.setUid("user-customer");
        // A profile left over from the retired CUSTOMER role. It is no longer a
        // role this application recognises, so it must be refused.
        user.setRole("CUSTOMER");

        when(userRepository.findByUid("user-customer")).thenReturn(Optional.of(user));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> staffService.createStaff(request)
        );
        assertEquals("User must have a staff role", ex.getMessage());
    }

    @Test
    void createStaff_FailsWhenUserAlreadyLinked() {
        CreateStaffRequest request = new CreateStaffRequest(
                "user-1",
                "EMP-002",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                75000.0,
                "0771234567"
        );

        User user = new User();
        user.setUid("user-1");
        user.setRole(Role.STAFF.name());

        when(userRepository.findByUid("user-1")).thenReturn(Optional.of(user));
        when(staffRepository.findByUserUid("user-1")).thenReturn(Optional.of(new Staff()));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> staffService.createStaff(request)
        );
        assertEquals("User is already linked to a staff profile", ex.getMessage());
    }

    @Test
    void createStaff_FailsWhenEmployeeIdAlreadyUsed() {
        CreateStaffRequest request = new CreateStaffRequest(
                "user-1",
                "EMP-001",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                75000.0,
                "0771234567"
        );

        User user = new User();
        user.setUid("user-1");
        user.setRole(Role.STAFF.name());

        when(userRepository.findByUid("user-1")).thenReturn(Optional.of(user));
        when(staffRepository.findByUserUid("user-1")).thenReturn(Optional.empty());
        when(staffRepository.findByEmployeeId("EMP-001")).thenReturn(Optional.of(new Staff()));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> staffService.createStaff(request)
        );
        assertEquals("Employee ID is already in use", ex.getMessage());
    }

    @Test
    void createStaff_FailsWhenSalaryIsNegative() {
        CreateStaffRequest request = new CreateStaffRequest(
                "user-1",
                "EMP-001",
                StaffDepartment.HOUSEKEEPING,
                "Housekeeper",
                LocalDate.now(),
                -500.0,
                "0771234567"
        );

        User user = new User();
        user.setUid("user-1");
        user.setRole(Role.STAFF.name());

        when(userRepository.findByUid("user-1")).thenReturn(Optional.of(user));
        when(staffRepository.findByUserUid("user-1")).thenReturn(Optional.empty());
        when(staffRepository.findByEmployeeId("EMP-001")).thenReturn(Optional.empty());

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> staffService.createStaff(request)
        );
        assertEquals("Salary cannot be negative", ex.getMessage());
    }

    @Test
    void filterStaff_ByDepartmentAndStatus() {
        Staff s1 = new Staff();
        s1.setDepartment(StaffDepartment.HOUSEKEEPING);
        s1.setEmploymentStatus(EmploymentStatus.ACTIVE);

        Staff s2 = new Staff();
        s2.setDepartment(StaffDepartment.HOUSEKEEPING);
        s2.setEmploymentStatus(EmploymentStatus.ON_LEAVE);

        Staff s3 = new Staff();
        s3.setDepartment(StaffDepartment.MAINTENANCE);
        s3.setEmploymentStatus(EmploymentStatus.ACTIVE);

        when(staffRepository.findAll()).thenReturn(List.of(s1, s2, s3));

        List<Staff> filtered = staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);
        assertEquals(1, filtered.size());
        assertSame(s1, filtered.get(0));

        List<Staff> byDept = staffService.getStaff(StaffDepartment.HOUSEKEEPING, null);
        assertEquals(2, byDept.size());

        List<Staff> byStatus = staffService.getStaff(null, EmploymentStatus.ACTIVE);
        assertEquals(2, byStatus.size());
    }

    @Test
    void housekeeping_RejectsAssignmentIfStaffInactive() {
        HousekeepingRepository housekeepingRepository = mock(HousekeepingRepository.class);
        RoomRepository roomRepository = mock(RoomRepository.class);
        HousekeepingService housekeepingService = new HousekeepingService(
                housekeepingRepository, roomRepository, userRepository, staffRepository
        );

        HousekeepingTask task = new HousekeepingTask();
        task.setTaskId("task-1");
        task.setStatus(HousekeepingTaskStatus.PENDING);
        when(housekeepingRepository.findById("task-1")).thenReturn(Optional.of(task));

        User user = new User();
        user.setUid("staff-user-1");
        user.setRole(Role.HOUSEKEEPING.name());
        when(userRepository.findByUid("staff-user-1")).thenReturn(Optional.of(user));

        Staff staffProfile = new Staff();
        staffProfile.setUserUid("staff-user-1");
        staffProfile.setEmploymentStatus(EmploymentStatus.ON_LEAVE);
        when(staffRepository.findByUserUid("staff-user-1")).thenReturn(Optional.of(staffProfile));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> housekeepingService.assignTask("task-1", "staff-user-1")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void maintenance_RejectsAssignmentIfStaffInactive() {
        MaintenanceRepository maintenanceRepository = mock(MaintenanceRepository.class);
        RoomRepository roomRepository = mock(RoomRepository.class);
        HousekeepingRepository housekeepingRepository = mock(HousekeepingRepository.class);
        MaintenanceService maintenanceService = new MaintenanceService(
                maintenanceRepository, roomRepository, userRepository, housekeepingRepository, staffRepository
        );

        MaintenanceTask task = new MaintenanceTask();
        task.setTaskId("m-task-1");
        task.setStatus(MaintenanceStatus.PENDING);
        when(maintenanceRepository.findById("m-task-1")).thenReturn(Optional.of(task));

        User user = new User();
        user.setUid("staff-m-1");
        user.setRole(Role.MAINTENANCE.name());
        when(userRepository.findByUid("staff-m-1")).thenReturn(Optional.of(user));

        Staff staffProfile = new Staff();
        staffProfile.setUserUid("staff-m-1");
        staffProfile.setEmploymentStatus(EmploymentStatus.TERMINATED);
        when(staffRepository.findByUserUid("staff-m-1")).thenReturn(Optional.of(staffProfile));

        IllegalArgumentException ex = assertThrows(
                IllegalArgumentException.class,
                () -> maintenanceService.assignTask("m-task-1", "staff-m-1")
        );
        assertEquals("Staff member is not active", ex.getMessage());
    }

    @Test
    void getStaff_BulkSync_DoesNotPerformNPlusOneQueriesForExistingStaff() {
        // Mock 3 users with staff roles
        User u1 = new User();
        u1.setUid("hk-user-1");
        u1.setRole(Role.HOUSEKEEPING.name());

        User u2 = new User();
        u2.setUid("maint-user-1");
        u2.setRole(Role.MAINTENANCE.name());

        User u3 = new User();
        u3.setUid("admin-user-1");
        u3.setRole(Role.ADMIN.name());

        when(userRepository.findAll()).thenReturn(List.of(u1, u2, u3));

        // Staff profiles already exist for all 3 users
        Staff s1 = new Staff();
        s1.setUserUid("hk-user-1");
        s1.setDepartment(StaffDepartment.HOUSEKEEPING);
        s1.setEmploymentStatus(EmploymentStatus.ACTIVE);

        Staff s2 = new Staff();
        s2.setUserUid("maint-user-1");
        s2.setDepartment(StaffDepartment.MAINTENANCE);
        s2.setEmploymentStatus(EmploymentStatus.ACTIVE);

        Staff s3 = new Staff();
        s3.setUserUid("admin-user-1");
        s3.setDepartment(StaffDepartment.MANAGEMENT);
        s3.setEmploymentStatus(EmploymentStatus.ACTIVE);

        when(staffRepository.findAll()).thenReturn(List.of(s1, s2, s3));

        List<Staff> result = staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);

        assertEquals(1, result.size());
        assertEquals("hk-user-1", result.get(0).getUserUid());

        // Crucial performance verification: findByUserUid must NEVER be called in a loop for existing staff
        verify(staffRepository, never()).findByUserUid(anyString());
        verify(staffRepository, never()).save(any(Staff.class));
    }

    @Test
    void getStaff_SyncCreatesDefaultStaffForMissingUser() {
        User u1 = new User();
        u1.setUid("new-hk-user");
        u1.setRole(Role.HOUSEKEEPING.name());
        u1.setEnabled(true);

        when(userRepository.findAll()).thenReturn(List.of(u1));
        when(staffRepository.findAll()).thenReturn(new java.util.ArrayList<>());
        when(staffRepository.save(any(Staff.class))).thenAnswer(inv -> inv.getArgument(0));

        List<Staff> result = staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);

        assertEquals(1, result.size());
        assertEquals("new-hk-user", result.get(0).getUserUid());
        assertEquals(StaffDepartment.HOUSEKEEPING, result.get(0).getDepartment());
        verify(staffRepository, times(1)).save(any(Staff.class));
    }

    @Test
    void getStaff_Throttling_DoesNotQueryUserRepositoryOnRapidRequests() {
        User u1 = new User();
        u1.setUid("hk-user-1");
        u1.setRole(Role.HOUSEKEEPING.name());

        when(userRepository.findAll()).thenReturn(List.of(u1));

        Staff s1 = new Staff();
        s1.setUserUid("hk-user-1");
        s1.setDepartment(StaffDepartment.HOUSEKEEPING);
        s1.setEmploymentStatus(EmploymentStatus.ACTIVE);

        when(staffRepository.findAll()).thenReturn(List.of(s1));

        // First call triggers sync
        staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);
        // Second immediate call within 60s cooldown window
        staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);
        staffService.getStaff(StaffDepartment.HOUSEKEEPING, EmploymentStatus.ACTIVE);

        // userRepository.findAll() should only be called once due to throttling
        verify(userRepository, times(1)).findAll();
    }
}

