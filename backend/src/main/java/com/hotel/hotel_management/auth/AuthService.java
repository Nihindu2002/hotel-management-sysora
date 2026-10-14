package com.hotel.hotel_management.auth;

import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final AuthRepository authRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(AuthRepository authRepository, UserRepository userRepository,
            PasswordEncoder passwordEncoder) {
        this.authRepository = authRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public LoginResponse login(LoginRequest request) {
        AuthRepository.Account account = authRepository.findByEmail(request.email())
                .filter(AuthRepository.Account::enabled)
                .filter(found -> passwordEncoder.matches(request.password(), found.passwordHash()))
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        User profile = userRepository.findByUid(account.uid())
                .filter(User::isEnabled)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        String token = authRepository.createSession(account.uid());
        return new LoginResponse("Login successful", token, "", account.uid(),
                profile.getEmail(), "28800");
    }

    public void logout(String token) {
        if (token != null && !token.isBlank()) authRepository.revokeSession(token);
    }

    public void changePassword(String uid, String currentPassword, String newPassword) {
        AuthRepository.Account account = authRepository.findByEmail(
                        userRepository.findByUid(uid).map(User::getEmail).orElse(""))
                .filter(AuthRepository.Account::enabled)
                .orElseThrow(() -> new BadCredentialsException("Invalid account"));
        if (!passwordEncoder.matches(currentPassword, account.passwordHash())) {
            throw new BadCredentialsException("Current password is incorrect");
        }
        authRepository.updatePassword(uid, passwordEncoder.encode(newPassword));
    }
}
