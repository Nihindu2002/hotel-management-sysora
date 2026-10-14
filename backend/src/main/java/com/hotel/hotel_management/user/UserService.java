package com.hotel.hotel_management.user;

import com.hotel.hotel_management.auth.AuthRepository;
import com.hotel.hotel_management.auth.ConflictException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final AuthRepository authRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, AuthRepository authRepository,
            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.authRepository = authRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> getAllUsers() { return userRepository.findAll(); }

    public User getUserByUid(String uid) {
        return userRepository.findByUid(uid).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUser(String uid, UpdateUserRequest request) {
        return userRepository.updateProfile(uid, request);
    }

    public User updateRole(String uid, Role role) {
        return userRepository.updateRole(uid, role);
    }

    @Transactional
    public void resetPassword(String uid, String password) {
        User user = getUserByUid(uid);
        authRepository.createOrResetAccount(uid, user.getEmail(), passwordEncoder.encode(password));
    }

    @Transactional
    public CreateUserResponse createUser(CreateUserRequest request) {
        if (request.role() == null || !Role.isStaffRole(request.role().name())) {
            throw new IllegalArgumentException("Role must be a staff role");
        }
        if (authRepository.findByEmail(request.email()).isPresent()) {
            throw new ConflictException("Email is already registered");
        }
        String uid = java.util.UUID.randomUUID().toString();
        userRepository.createProfile(uid, request.email(), request.firstName(),
                request.lastName(), request.phone(), request.role());
        try {
            authRepository.createAccount(uid, request.email(), passwordEncoder.encode(request.password()));
        } catch (DuplicateKeyException exception) {
            throw new ConflictException("Email is already registered");
        }
        return new CreateUserResponse("Staff account created", uid, request.email(), request.role().name());
    }
}
