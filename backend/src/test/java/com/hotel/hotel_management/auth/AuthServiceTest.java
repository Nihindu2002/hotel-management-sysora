package com.hotel.hotel_management.auth;

import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {
    @Test
    void loginIssuesSessionForValidCredentials() {
        AuthRepository authRepository = mock(AuthRepository.class);
        UserRepository userRepository = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        AuthService service = new AuthService(authRepository, userRepository, encoder);
        when(authRepository.findByEmail("user@example.com")).thenReturn(Optional.of(
                new AuthRepository.Account("uid-1", "user@example.com", "hash", true)));
        when(encoder.matches("Password1!", "hash")).thenReturn(true);
        User profile = new User();
        profile.setUid("uid-1");
        profile.setEmail("user@example.com");
        profile.setEnabled(true);
        when(userRepository.findByUid("uid-1")).thenReturn(Optional.of(profile));
        when(authRepository.createSession("uid-1")).thenReturn("session-token");

        LoginResponse result = service.login(new LoginRequest("user@example.com", "Password1!"));

        assertEquals("Login successful", result.message());
        assertEquals("session-token", result.idToken());
        assertEquals("uid-1", result.localId());
        assertEquals("28800", result.expiresIn());
    }

    @Test
    void loginRejectsInvalidPassword() {
        AuthRepository authRepository = mock(AuthRepository.class);
        AuthService service = new AuthService(authRepository, mock(UserRepository.class), mock(PasswordEncoder.class));
        when(authRepository.findByEmail("user@example.com")).thenReturn(Optional.of(
                new AuthRepository.Account("uid-1", "user@example.com", "hash", true)));

        assertThrows(BadCredentialsException.class,
                () -> service.login(new LoginRequest("user@example.com", "WrongPassword1!")));
    }
}
