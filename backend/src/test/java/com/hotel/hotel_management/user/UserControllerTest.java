package com.hotel.hotel_management.user;

import com.hotel.hotel_management.security.AuthenticatedUser;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The self-service /me endpoints exist so a signed-in user can edit their own
 * profile. These tests pin the property that makes that safe: the uid is always
 * taken from the authenticated token, never from caller input.
 */
class UserControllerTest {

    private UserService userService;
    private UserController userController;

    @BeforeEach
    void setUp() {
        userService = mock(UserService.class);
        userController = new UserController(userService);
    }

    @Test
    void updateCurrentUser_UsesUidFromToken() {
        Authentication authentication = mock(Authentication.class);
        AuthenticatedUser token = new AuthenticatedUser("user-id-1", "ada@example.com");
        when(authentication.getPrincipal()).thenReturn(token);

        UpdateUserRequest request = new UpdateUserRequest("Ada", "Lovelace", "0771234567");
        User updated = new User();
        updated.setUid("user-id-1");

        when(userService.updateUser("user-id-1", request)).thenReturn(updated);

        User actual = userController.updateCurrentUser(authentication, request);

        assertSame(updated, actual);
        verify(userService).updateUser("user-id-1", request);
    }

    @Test
    void getCurrentUser_UsesUidFromToken() {
        Authentication authentication = mock(Authentication.class);
        AuthenticatedUser token = new AuthenticatedUser("user-id-2", "ada@example.com");
        when(authentication.getPrincipal()).thenReturn(token);

        User profile = new User();
        profile.setUid("user-id-2");
        when(userService.getUserByUid("user-id-2")).thenReturn(profile);

        assertSame(profile, userController.getCurrentUser(authentication));
    }

    @Test
    void updateCurrentUser_FallsBackToAuthenticatedProfileDetail() {
        Authentication authentication = mock(Authentication.class);
        User principalProfile = new User();
        principalProfile.setUid("detail-uid");

        when(authentication.getPrincipal()).thenReturn("anonymous-string");
        when(authentication.getDetails()).thenReturn(principalProfile);

        UpdateUserRequest request = new UpdateUserRequest("Ada", "Lovelace", null);
        User updated = new User();
        when(userService.updateUser("detail-uid", request)).thenReturn(updated);

        assertSame(updated, userController.updateCurrentUser(authentication, request));
    }

    @Test
    void updateCurrentUser_RejectsUnauthenticatedCaller() {
        UpdateUserRequest request = new UpdateUserRequest("Ada", "Lovelace", null);

        assertThrows(BadCredentialsException.class,
                () -> userController.updateCurrentUser(null, request));

        verify(userService, never()).updateUser(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void updateCurrentUser_RejectsUnrecognisedPrincipal() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.getPrincipal()).thenReturn("not-a-token");
        when(authentication.getDetails()).thenReturn(null);

        UpdateUserRequest request = new UpdateUserRequest("Ada", "Lovelace", null);

        assertThrows(BadCredentialsException.class,
                () -> userController.updateCurrentUser(authentication, request));

        verify(userService, never()).updateUser(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any());
    }

    /**
     * The admin path still targets whatever uid is passed, so the /me guard must
     * not have changed admin behaviour.
     */
    @Test
    void updateUser_ByUid_StillTargetsRequestedUid() {
        UpdateUserRequest request = new UpdateUserRequest("Grace", "Hopper", "0779999999");
        User updated = new User();
        updated.setUid("other-user");

        when(userService.updateUser("other-user", request)).thenReturn(updated);

        assertSame(updated, userController.updateUser("other-user", request));
    }
}
