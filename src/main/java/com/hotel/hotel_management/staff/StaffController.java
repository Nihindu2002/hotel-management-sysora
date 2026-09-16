package com.hotel.hotel_management.staff;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Staff", description = "Staff member management and employment status tracking")
@RestController
@RequestMapping("/api/staff")
public class StaffController {

    private final StaffService staffService;

    public StaffController(StaffService staffService) {
        this.staffService = staffService;
    }

    @Operation(summary = "Create staff member", description = "Enrolls a user as a staff member with department and position")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Staff member created"),
            @ApiResponse(responseCode = "400", description = "Validation error or user already a staff member")
    })
    @PostMapping
    public ResponseEntity<Staff> createStaff(@RequestBody CreateStaffRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(staffService.createStaff(request));
    }

    @Operation(summary = "Get staff list", description = "Retrieves staff members with optional filtering by department and status")
    @GetMapping
    public ResponseEntity<List<Staff>> getStaff(
            @RequestParam(required = false) StaffDepartment department,
            @RequestParam(required = false) EmploymentStatus status) {
        return ResponseEntity.ok(staffService.getStaff(department, status));
    }

    @Operation(summary = "Get staff by ID", description = "Retrieves staff details by staffId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Staff found"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @GetMapping("/{staffId}")
    public ResponseEntity<Staff> getStaffById(@PathVariable String staffId) {
        return ResponseEntity.ok(staffService.getStaffById(staffId));
    }

    @Operation(summary = "Get staff by user UID", description = "Retrieves staff details linked to a Firebase user UID")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Staff found"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @GetMapping("/user/{userUid}")
    public ResponseEntity<Staff> getStaffByUserUid(@PathVariable String userUid) {
        return ResponseEntity.ok(staffService.getStaffByUserUid(userUid));
    }

    @Operation(summary = "Update staff details", description = "Updates department, position, salary, or contact of staff member")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Staff updated"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @PutMapping("/{staffId}")
    public ResponseEntity<Staff> updateStaff(
            @PathVariable String staffId,
            @RequestBody UpdateStaffRequest request) {
        return ResponseEntity.ok(staffService.updateStaff(staffId, request));
    }

    @Operation(summary = "Update staff employment status", description = "Updates employment status (ACTIVE, ON_LEAVE, TERMINATED, etc.)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Status updated"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @PatchMapping("/{staffId}/status")
    public ResponseEntity<Staff> updateStatus(
            @PathVariable String staffId,
            @RequestBody UpdateStaffStatusRequest request) {
        return ResponseEntity.ok(staffService.updateStatus(staffId, request.employmentStatus()));
    }

    @Operation(summary = "Delete staff member", description = "Removes a staff record (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Staff deleted"),
            @ApiResponse(responseCode = "404", description = "Staff not found")
    })
    @DeleteMapping("/{staffId}")
    public ResponseEntity<Void> deleteStaff(@PathVariable String staffId) {
        staffService.deleteStaff(staffId);
        return ResponseEntity.noContent().build();
    }
}

