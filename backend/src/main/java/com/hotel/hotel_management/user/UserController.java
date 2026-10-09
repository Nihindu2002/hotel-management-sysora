package com.hotel.hotel_management.user;

import com.google.firebase.auth.FirebaseToken;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
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
    public User getCurrentUser(Authentication authentication) {
        return userService.getUserByUid(resolveUid(authentication));
    }

    @Operation(summary = "Update own profile",
            description = "Updates the authenticated user's own first name, last name, and phone. "
                    + "Email and role are not part of the payload and cannot be changed here.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Profile updated successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error"),
            @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PutMapping("/me")
    public User updateCurrentUser(
            Authentication authentication,
            @Valid @RequestBody UpdateUserRequest request) {

        // The uid is resolved from the token rather than the path or body, so a
        // caller can only ever edit their own record.
        return userService.updateUser(resolveUid(authentication), request);
    }

    @Operation(summary = "Create a staff account",
            description = "Provisions a Firebase Authentication login and profile for a hotel "
                    + "employee. The role must be a staff role.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Staff account created"),
            @ApiResponse(responseCode = "400", description = "Validation error or non-staff role"),
            @ApiResponse(responseCode = "409", description = "Email already registered")
    })
    @PostMapping
    public ResponseEntity<CreateUserResponse> createUser(
            @Valid @RequestBody CreateUserRequest request) {

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(userService.createUser(request));
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
            @Valid @RequestBody UpdateUserRequest request) {

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

    /**
     * Resolves the caller's Firebase UID from the authenticated principal. The
     * self-service /me endpoints use this so the uid never comes from input.
     */
    private String resolveUid(Authentication authentication) {
        if (authentication == null) {
            throw new BadCredentialsException("Not authenticated");
        }

        if (authentication.getPrincipal() instanceof FirebaseToken token) {
            return token.getUid();
        }

        if (authentication.getDetails() instanceof User profile) {
            return profile.getUid();
        }

        throw new BadCredentialsException("Invalid authentication principal");
    }
}