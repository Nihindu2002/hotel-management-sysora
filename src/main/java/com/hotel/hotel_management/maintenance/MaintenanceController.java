package com.hotel.hotel_management.maintenance;

import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/maintenance")
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    public MaintenanceController(MaintenanceService maintenanceService) {
        this.maintenanceService = maintenanceService;
    }

    @PostMapping("/tasks")
    public ResponseEntity<MaintenanceTask> createTask(
            @Valid @RequestBody CreateMaintenanceTaskRequest request,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.createTask(
                        request,
                        token != null ? token.getUid() : null));
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<MaintenanceTask>> getAllTasks() {
        return ResponseEntity.ok(
                maintenanceService.getAllTasks());
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<MaintenanceTask> getTaskById(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                maintenanceService.getTaskById(taskId));
    }

    @GetMapping("/rooms/{roomId}/tasks")
    public ResponseEntity<List<MaintenanceTask>> getTasksByRoomId(
            @PathVariable String roomId) {

        return ResponseEntity.ok(
                maintenanceService.getTasksByRoomId(roomId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<MaintenanceTask>> getMyTasks(
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.getMyTasks(token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/assign")
    public ResponseEntity<MaintenanceTask> assignTask(
            @PathVariable String taskId,
            @Valid @RequestBody AssignMaintenanceTaskRequest request) {

        return ResponseEntity.ok(
                maintenanceService.assignTask(taskId, request.staffUid()));
    }

    @PatchMapping("/tasks/{taskId}/start")
    public ResponseEntity<MaintenanceTask> startTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.startTask(taskId, token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<MaintenanceTask> completeTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                maintenanceService.completeTask(taskId, token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/cancel")
    public ResponseEntity<MaintenanceTask> cancelTask(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                maintenanceService.cancelTask(taskId));
    }
}

