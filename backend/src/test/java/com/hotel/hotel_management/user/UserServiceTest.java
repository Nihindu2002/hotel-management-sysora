package com.hotel.hotel_management.user;

import com.hotel.hotel_management.auth.AuthRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    @Test
    void updateUserDelegatesToRepository() {
        UserRepository userRepository = mock(UserRepository.class);
        UserService userService = new UserService(userRepository, mock(AuthRepository.class), mock(PasswordEncoder.class));

        UpdateUserRequest request = new UpdateUserRequest("Ada", "Lovelace", "1234567890");
        User expected = new User();
        expected.setUid("user-123");

        when(userRepository.updateProfile("user-123", request)).thenReturn(expected);

        User actual = userService.updateUser("user-123", request);

        assertSame(expected, actual);
        verify(userRepository).updateProfile("user-123", request);
    }
}
