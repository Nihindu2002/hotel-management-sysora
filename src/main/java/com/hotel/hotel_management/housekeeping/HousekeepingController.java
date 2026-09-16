package com.hotel.hotel_management.housekeeping;

import com.google.firebase.auth.FirebaseToken;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/housekeeping")
public class HousekeepingController {

    private final HousekeepingService housekeepingService;

    public HousekeepingController(HousekeepingService housekeepingService) {
        this.housekeepingService = housekeepingService;
    }

    @PostMapping("/tasks")
    public ResponseEntity<HousekeepingTask> createTask(
            @Valid @RequestBody CreateHousekeepingTaskRequest request) {

        return ResponseEntity.ok(
                housekeepingService.createTask(request));
    }

    @GetMapping("/tasks")
    public ResponseEntity<List<HousekeepingTask>> getAllTasks() {
        return ResponseEntity.ok(
                housekeepingService.getAllTasks());
    }

    @GetMapping("/tasks/{taskId}")
    public ResponseEntity<HousekeepingTask> getTaskById(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                housekeepingService.getTaskById(taskId));
    }

    @GetMapping("/rooms/{roomId}/tasks")
    public ResponseEntity<List<HousekeepingTask>> getTasksByRoomId(
            @PathVariable String roomId) {

        return ResponseEntity.ok(
                housekeepingService.getTasksByRoomId(roomId));
    }

    @GetMapping("/my")
    public ResponseEntity<List<HousekeepingTask>> getMyTasks(
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.getMyTasks(token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/assign")
    public ResponseEntity<HousekeepingTask> assignTask(
            @PathVariable String taskId,
            @Valid @RequestBody AssignHousekeepingTaskRequest request) {

        return ResponseEntity.ok(
                housekeepingService.assignTask(taskId, request.staffUid()));
    }

    @PatchMapping("/tasks/{taskId}/start")
    public ResponseEntity<HousekeepingTask> startTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.startTask(taskId, token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/complete")
    public ResponseEntity<HousekeepingTask> completeTask(
            @PathVariable String taskId,
            @AuthenticationPrincipal FirebaseToken token) {

        return ResponseEntity.ok(
                housekeepingService.completeTask(taskId, token.getUid()));
    }

    @PatchMapping("/tasks/{taskId}/cancel")
    public ResponseEntity<HousekeepingTask> cancelTask(
            @PathVariable String taskId) {

        return ResponseEntity.ok(
                housekeepingService.cancelTask(taskId));
    }
}

