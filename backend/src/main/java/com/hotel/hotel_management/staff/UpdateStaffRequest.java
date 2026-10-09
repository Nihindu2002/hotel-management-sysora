package com.hotel.hotel_management.staff;

import java.time.LocalDate;

public record UpdateStaffRequest(
        String employeeId,
        StaffDepartment department,
        String position,
        LocalDate hireDate,
        Double salary,
        String emergencyContact
) {
}

