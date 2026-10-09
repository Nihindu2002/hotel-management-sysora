package com.hotel.hotel_management.staff;

import java.time.LocalDate;

public record CreateStaffRequest(
        String userUid,
        String employeeId,
        StaffDepartment department,
        String position,
        LocalDate hireDate,
        Double salary,
        String emergencyContact
) {
}

