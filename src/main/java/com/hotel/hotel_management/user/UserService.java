package com.hotel.hotel_management.user;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserByUid(String uid) {
        return userRepository.findByUid(uid)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }

    public User updateUser(String uid, UpdateUserRequest request) {
        return userRepository.updateProfile(uid, request);
    }

    public User updateRole(String uid, Role role) {
        return userRepository.updateRole(uid, role);
    }
}