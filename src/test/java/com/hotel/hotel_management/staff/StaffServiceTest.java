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
    void createStaff_FailsWhenUserHasCustomerRole() {
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
        user.setRole(Role.CUSTOMER.name());

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
}

