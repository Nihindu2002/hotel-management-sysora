package com.hotel.hotel_management.auth;

import com.google.firebase.auth.FirebaseAuth;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.lang.reflect.Field;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    @Test
    void loginReturnsMappedFirebaseResponse() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        FirebaseAuth firebaseAuth = mock(FirebaseAuth.class);
        AuthService service = new AuthService(userRepository, firebaseAuth, "test-api-key");

        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec requestBodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec requestBodySpec = mock(RestClient.RequestBodySpec.class);
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key"))
                .thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(LoginFirebaseRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenReturn(responseSpec);
        when(responseSpec.body(LoginFirebaseResponse.class)).thenReturn(new LoginFirebaseResponse(
                "id-token",
                "refresh-token",
                "local-id",
                "user@example.com",
                "3600"
        ));

        Field restClientField = AuthService.class.getDeclaredField("restClient");
        restClientField.setAccessible(true);
        restClientField.set(service, restClient);

        LoginResponse response = service.login(new LoginRequest("user@example.com", "Password1!"));

        assertEquals("Login successful", response.message());
        assertEquals("id-token", response.idToken());
        assertEquals("refresh-token", response.refreshToken());
        assertEquals("local-id", response.localId());
        assertEquals("user@example.com", response.email());
        assertEquals("3600", response.expiresIn());
    }

    @Test
    void loginThrowsUnauthorizedWhenFirebaseRejectsCredentials() throws Exception {
        UserRepository userRepository = mock(UserRepository.class);
        FirebaseAuth firebaseAuth = mock(FirebaseAuth.class);
        AuthService service = new AuthService(userRepository, firebaseAuth, "test-api-key");

        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec requestBodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec requestBodySpec = mock(RestClient.RequestBodySpec.class);

        when(restClient.post()).thenReturn(requestBodyUriSpec);
        when(requestBodyUriSpec.uri("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=test-api-key"))
                .thenReturn(requestBodySpec);
        when(requestBodySpec.body(any(LoginFirebaseRequest.class))).thenReturn(requestBodySpec);
        when(requestBodySpec.retrieve()).thenThrow(new RestClientResponseException(
                "INVALID_PASSWORD",
                400,
                "Bad Request",
                null,
                null,
                null
        ));

        Field restClientField = AuthService.class.getDeclaredField("restClient");
        restClientField.setAccessible(true);
        restClientField.set(service, restClient);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class,
                () -> service.login(new LoginRequest("user@example.com", "WrongPassword1!")));

        assertEquals(HttpStatus.UNAUTHORIZED, exception.getStatusCode());
        assertEquals("Invalid email or password", exception.getReason());
    }
}
