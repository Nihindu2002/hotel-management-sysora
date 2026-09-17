package com.hotel.hotel_management.housekeeping;
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

@Tag(name = "Housekeeping", description = "Housekeeping and cleaning task management")
@RestController
@RequestMapping("/api/housekeeping")
public class HousekeepingController {

    private final HousekeepingService housekeepingService;

    public HousekeepingController(HousekeepingService housekeepingService) {
        this.housekeepingService = housekeepingService;
    }

    @Operation(summary = "Create housekeeping task", description = "Creates a new housekeeping task for a room")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task created"),
            @ApiResponse(responseCode = "400", description = "Validation error or staff validation failed")
    })
    @PostMapping("/tasks")
    public ResponseEntity<HousekeepingTask> createTask(
            @Valid @RequestBody CreateHousekeepingTaskRequest request) {

        return ResponseEntity.ok(
                housekeepingService.createTask(request));
    }

    @Operation(summary = "Get all housekeeping tasks", description = "Retrieves a list of all housekeeping tasks")
    @GetMapping("/tasks")
    public ResponseEntity<List<HousekeepingTask>> getAllTasks() {
        return ResponseEntity.ok(
                housekeepingService.getAllTasks());
    }

    @Operation(summary = "Get housekeeping dashboard statistics", description = "Returns pending, assigned, in-progress, completed-today, cancelled, and rooms-needing-cleaning metrics")
    @GetMapping("/dashboard")
    public ResponseEntity<HousekeepingDashboardResponse> getDashboard() {
        return ResponseEntity.ok(housekeepingService.getDashboard());
    }

    @Operation(summary = "Get housekeeping task by ID", description = "Retrieves housekeeping task details by taskId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task found"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<HousekeepingTask> getTaskById(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                housekeepingService.getTaskById(taskId));
    }

    @Operation(summary = "Get tasks by room ID", description = "Retrieves all housekeeping tasks for a specific room")
    @GetMapping("/rooms/{roomId}/tasks")
    public ResponseEntity<List<HousekeepingTask>> getTasksByRoomId(
            @PathVariable String roomId) {

        return ResponseEntity.ok(
                housekeepingService.getTasksByRoomId(roomId));
    }

    @Operation(summary = "Get my housekeeping tasks", description = "Retrieves tasks assigned to the currently authenticated housekeeping staff member")
    @GetMapping("/my")
    public ResponseEntity<List<HousekeepingTask>> getMyTasks(
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.getMyTasks(token.getUid()));
    }

    @Operation(summary = "Assign housekeeping task", description = "Assigns task to an active housekeeping staff member")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task assigned"),
            @ApiResponse(responseCode = "400", description = "Staff not active or not in housekeeping department"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/assign")
    public ResponseEntity<HousekeepingTask> assignTask(
            @PathVariable String taskId,
            @Valid @RequestBody AssignHousekeepingTaskRequest request) {

        return ResponseEntity.ok(
                housekeepingService.assignTask(taskId, request.staffUid()));
    }

    @Operation(summary = "Start housekeeping task", description = "Marks an assigned housekeeping task as IN_PROGRESS")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task started"),
            @ApiResponse(responseCode = "400", description = "Task not assigned to user or not in PENDING status"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/start")
    public ResponseEntity<HousekeepingTask> startTask(
            @PathVariable String taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.startTask(taskId, token.getUid()));
    }

    @Operation(summary = "Complete housekeeping task", description = "Completes task and transitions room status to AVAILABLE")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task completed"),
            @ApiResponse(responseCode = "400", description = "Task not assigned to user or not in progress"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<HousekeepingTask> completeTask(
            @PathVariable String taskId,
            @Parameter(hidden = true) @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.completeTask(taskId, token.getUid()));
    }

    @Operation(summary = "Cancel housekeeping task", description = "Cancels a housekeeping task")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Task cancelled"),
            @ApiResponse(responseCode = "404", description = "Task not found")
    })
    @PatchMapping("/tasks/{taskId}/cancel")
    public ResponseEntity<HousekeepingTask> cancelTask(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                housekeepingService.cancelTask(taskId));
    }
}

