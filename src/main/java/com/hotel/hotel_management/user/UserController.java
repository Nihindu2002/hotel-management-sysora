package com.hotel.hotel_management.user;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @GetMapping("/{uid}")
    public User getUserByUid(@PathVariable String uid) {
        return userService.getUserByUid(uid);
    }

    @PutMapping("/{uid}")
    public User updateUser(
            @PathVariable String uid,
            @jakarta.validation.Valid @RequestBody UpdateUserRequest request) {

        return userService.updateUser(uid, request);
    }

    @PatchMapping("/{uid}/role")
    public User updateRole(
            @PathVariable String uid,
            @RequestParam Role role) {

        return userService.updateRole(uid, role);
    }
}