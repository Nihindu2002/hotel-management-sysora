package com.hotel.hotel_management.maintenance;
import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Maintenance", description = "Maintenance task reporting, assignment, and cost tracking")
@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    @Operation(summary = "Create maintenance task", description = "Creates a new maintenance task and marks room as UNDER_MAINTENANCE")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task created"),
            @ApiResponse(responseCode = "400", description = "Validation error or invalid staff assignment")
    })
    @PostMapping("/tasks")
    public ResponseEntity<MaintenanceTask> createTask(
            @Valid @RequestBody CreateMaintenanceTaskRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.createTask(
                        request,
                        token != null ? token.getUid() : null));
    }

    @Operation(summary = "Get all maintenance tasks", description = "Retrieves a list of all maintenance tasks")
    @GetMapping("/tasks")
    public ResponseEntity<List<MaintenanceTask>> getAllTasks() {
        return ResponseEntity.ok(
                maintenanceService.getAllTasks());
    }

    @Operation(summary = "Get maintenance task by ID", description = "Retrieves maintenance task details by taskId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task found"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<MaintenanceTask> getTaskById(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                maintenanceService.getTaskById(taskId));
    }

    @Operation(summary = "Get maintenance tasks by room ID", description = "Retrieves all maintenance tasks for a room")
    @GetMapping("/rooms/{roomId}/tasks")
    public ResponseEntity<List<MaintenanceTask>> getTasksByRoomId(
            @PathVariable String roomId) {

        return ResponseEntity.ok(
                maintenanceService.getTasksByRoomId(roomId));
    }

    @Operation(summary = "Get my maintenance tasks", description = "Retrieves tasks assigned to current maintenance staff")
    @GetMapping("/my")
    public ResponseEntity<List<MaintenanceTask>> getMyTasks(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.getMyTasks(token.getUid()));
    }

    @Operation(summary = "Assign maintenance task", description = "Assigns task to an active maintenance staff member")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task assigned"),
            @ApiResponse(responseCode = "400", description = "Staff not active or not in maintenance department"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/assign")
    public ResponseEntity<MaintenanceTask> assignTask(
            @PathVariable String taskId,
            @Valid @RequestBody AssignMaintenanceTaskRequest request) {

        return ResponseEntity.ok(
                maintenanceService.assignTask(taskId, request.staffUid()));
    }

    @Operation(summary = "Start maintenance task", description = "Marks task as IN_PROGRESS by assigned staff")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task started"),
            @ApiResponse(responseCode = "400", description = "Task not assigned to user or not in PENDING status"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/start")
    public ResponseEntity<MaintenanceTask> startTask(
            @PathVariable String taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.startTask(taskId, token.getUid()));
    }

    @Operation(summary = "Complete maintenance task", description = "Completes task, sets room to AVAILABLE, and records finance expense if cost > 0")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task completed"),
            @ApiResponse(responseCode = "400", description = "Task not assigned to user or not in progress"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<MaintenanceTask> completeTask(
            @PathVariable String taskId,
            @RequestBody(required = false) CompleteMaintenanceTaskRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        Double actualCost = request != null ? request.actualCost() : 0.0;

        return ResponseEntity.ok(
                maintenanceService.completeTask(taskId, token.getUid(), actualCost));
    }

    @Operation(summary = "Update maintenance task cost", description = "Updates actual cost for a task and synchronizes with finance expense record")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Cost updated"),
            @ApiResponse(responseCode = "400", description = "Cost cannot be negative"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/cost")
    public ResponseEntity<MaintenanceTask> updateTaskCost(
            @PathVariable String taskId,
            @Valid @RequestBody UpdateMaintenanceCostRequest request,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.updateTaskCost(
                        taskId,
                        request.actualCost(),
                        token != null ? token.getUid() : null));
    }

    @Operation(summary = "Cancel maintenance task", description = "Cancels a maintenance task")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task cancelled"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/cancel")
    public ResponseEntity<MaintenanceTask> cancelTask(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                maintenanceService.cancelTask(taskId));
    }
}

