package com.hotel.hotel_management.user;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.hotel.hotel_management.auth.ConflictException;
import com.hotel.hotel_management.auth.FirebaseOperationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

    private final UserRepository userRepository;
    private final FirebaseAuth firebaseAuth;

    public UserService(UserRepository userRepository, FirebaseAuth firebaseAuth) {
        this.userRepository = userRepository;
        this.firebaseAuth = firebaseAuth;
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

    /**
     * Provisions a staff login.
     *
     * Creates the Firebase Authentication account first, then the profile that
     * carries the role. If the profile write fails the Firebase account is
     * rolled back, so a half-created user cannot be left behind — one that could
     * sign in but would be rejected by the token filter for having no profile.
     *
     * Only staff roles are accepted: this application has no customer accounts.
     */
    public CreateUserResponse createUser(CreateUserRequest request) {

        if (request.role() == null || !Role.isStaffRole(request.role().name())) {
            throw new IllegalArgumentException("Role must be a staff role");
        }

        UserRecord createdUser;

        try {
            createdUser = firebaseAuth.createUser(new UserRecord.CreateRequest()
                    .setEmail(request.email())
                    .setPassword(request.password())
                    .setDisplayName(
                            (request.firstName() + " "
                                    + (request.lastName() != null ? request.lastName() : "")).trim()));
        } catch (FirebaseAuthException exception) {
            if (exception.getAuthErrorCode()
                    == com.google.firebase.auth.AuthErrorCode.EMAIL_ALREADY_EXISTS) {
                throw new ConflictException("Email is already registered");
            }

            String httpDetails = exception.getHttpResponse() == null
                    ? "no HTTP response"
                    : "status=" + exception.getHttpResponse().getStatusCode()
                            + ", body=" + exception.getHttpResponse().getContent();

            logger.error("Firebase Authentication createUser failed: code={}, {}, message={}",
                    exception.getAuthErrorCode(), httpDetails, exception.getMessage());

            throw new FirebaseOperationException(
                    "Unable to create Firebase Authentication account", exception);
        }

        try {
            userRepository.createProfile(
                    createdUser.getUid(),
                    createdUser.getEmail(),
                    request.firstName(),
                    request.lastName(),
                    request.phone(),
                    request.role());
        } catch (RuntimeException exception) {
            try {
                firebaseAuth.deleteUser(createdUser.getUid());
            } catch (FirebaseAuthException rollbackException) {
                exception.addSuppressed(rollbackException);
            }
            throw exception;
        }

        return new CreateUserResponse(
                "Staff account created",
                createdUser.getUid(),
                createdUser.getEmail(),
                request.role().name());
    }
}
