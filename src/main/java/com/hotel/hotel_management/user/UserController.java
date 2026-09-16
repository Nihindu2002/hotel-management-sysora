package com.hotel.hotel_management.user;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Users", description = "User management operations")
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // GET /api/users/me
    @Operation(summary = "Get current user profile",
            description = "Returns the authenticated user's own profile")
    @GetMapping("/me")
    public User getCurrentUser(
            org.springframework.security.core.Authentication authentication) {
        if (authentication == null) {
            throw new org.springframework.security.authentication.BadCredentialsException("Not authenticated");
        }
        String uid;
        if (authentication.getPrincipal() instanceof com.google.firebase.auth.FirebaseToken token) {
            uid = token.getUid();
        } else if (authentication.getDetails() instanceof User profile) {
            uid = profile.getUid();
        } else {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid authentication principal");
        }
        return userService.getUserByUid(uid);
    }

    @Operation(summary = "Get all users", description = "Retrieves a list of all registered users (Admin only)")
    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @Operation(summary = "Get user by UID", description = "Retrieves user profile details by Firebase UID (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User found"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping("/{uid}")
    public User getUserByUid(@PathVariable String uid) {
        return userService.getUserByUid(uid);
    }

    @Operation(summary = "Update user", description = "Updates user profile information (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/{uid}")
    public User updateUser(
            @PathVariable String uid,
            @jakarta.validation.Valid @RequestBody UpdateUserRequest request) {

        return userService.updateUser(uid, request);
    }

    @Operation(summary = "Update user role", description = "Updates user role in system and Firebase custom claims (Admin only)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Role updated successfully"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PatchMapping("/{uid}/role")
    public User updateRole(
            @PathVariable String uid,
            @RequestParam Role role) {

        return userService.updateRole(uid, role);
    }
}