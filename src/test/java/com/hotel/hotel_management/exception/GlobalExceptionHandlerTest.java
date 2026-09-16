package com.hotel.hotel_management.exception;

import com.hotel.hotel_management.auth.FirebaseOperationException;
import com.hotel.hotel_management.common.ForbiddenException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.Collections;
import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/test/resource");
    }

    @Test
    void handleResourceNotFound_Returns404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Room not found");
        ResponseEntity<ApiError> response = exceptionHandler.handleResourceNotFound(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(404, body.getStatus());
        assertEquals("Not Found", body.getError());
        assertEquals("Room not found", body.getMessage());
        assertEquals("/api/test/resource", body.getPath());
        assertNotNull(body.getTimestamp());
    }

    @Test
    void handleNoResourceFound_Returns404() {
        NoResourceFoundException ex = mock(NoResourceFoundException.class);
        ResponseEntity<ApiError> response = exceptionHandler.handleNoResourceFound(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(404, body.getStatus());
        assertEquals("Not Found", body.getError());
        assertEquals("Resource not found", body.getMessage());
        assertEquals("/api/test/resource", body.getPath());
    }

    @Test
    void handleConflict_Returns409() {
        ConflictException ex = new ConflictException("Room is already reserved for the selected dates");
        ResponseEntity<ApiError> response = exceptionHandler.handleConflict(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(409, body.getStatus());
        assertEquals("Conflict", body.getError());
        assertEquals("Room is already reserved for the selected dates", body.getMessage());
        assertEquals("/api/test/resource", body.getPath());
    }

    @Test
    void handleMethodArgumentNotValid_Returns400WithCleanMessage() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("reservation", "checkOutDate", "must be in the future");

        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));

        ResponseEntity<ApiError> response = exceptionHandler.handleValidation(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.getStatus());
        assertEquals("Validation Error", body.getError());
        assertEquals("checkOutDate must be in the future", body.getMessage());
        assertEquals("/api/test/resource", body.getPath());
    }

    @Test
    void handleConstraintViolation_Returns400() {
        ConstraintViolation<?> violation = mock(ConstraintViolation.class);
        when(violation.getMessage()).thenReturn("Price must be greater than 0");

        ConstraintViolationException ex = new ConstraintViolationException(Set.of(violation));
        ResponseEntity<ApiError> response = exceptionHandler.handleConstraintViolation(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.getStatus());
        assertEquals("Validation Error", body.getError());
        assertEquals("Price must be greater than 0", body.getMessage());
    }

    @Test
    void handleIllegalArgument_Returns400() {
        IllegalArgumentException ex = new IllegalArgumentException("Invalid date range");
        ResponseEntity<ApiError> response = exceptionHandler.handleIllegalArgument(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(400, body.getStatus());
        assertEquals("Bad Request", body.getError());
        assertEquals("Invalid date range", body.getMessage());
    }

    @Test
    void handleForbidden_Returns403() {
        ForbiddenException ex = new ForbiddenException("Staff member is not active");
        ResponseEntity<ApiError> response = exceptionHandler.handleForbidden(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(403, body.getStatus());
        assertEquals("Forbidden", body.getError());
        assertEquals("Staff member is not active", body.getMessage());
    }

    @Test
    void handleAccessDenied_Returns403() {
        AccessDeniedException ex = new AccessDeniedException("Access is denied");
        ResponseEntity<ApiError> response = exceptionHandler.handleAccessDenied(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(403, body.getStatus());
        assertEquals("Forbidden", body.getError());
        assertEquals("Access denied", body.getMessage());
    }

    @Test
    void handleAuthenticationFailure_Returns401() {
        AuthenticationException ex = mock(AuthenticationException.class);
        ResponseEntity<ApiError> response = exceptionHandler.handleAuthenticationFailure(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(401, body.getStatus());
        assertEquals("Unauthorized", body.getError());
        assertEquals("Full authentication is required to access this resource", body.getMessage());
    }

    @Test
    void handleFirebaseOperationFailure_Returns500Sanitized() {
        FirebaseOperationException ex = new FirebaseOperationException("Firebase service account secret key invalid");
        ResponseEntity<ApiError> response = exceptionHandler.handleFirebaseOperationFailure(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(500, body.getStatus());
        assertEquals("Internal Server Error", body.getError());
        assertFalse(body.getMessage().contains("secret key"));
        assertEquals("Authentication service operation failed", body.getMessage());
    }

    @Test
    void handleUnexpected_Returns500Sanitized() {
        RuntimeException ex = new RuntimeException("Fatal database connection failed at /etc/credentials/secret.json");
        ResponseEntity<ApiError> response = exceptionHandler.handleUnexpected(ex, request);

        assertNotNull(response);
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        ApiError body = response.getBody();
        assertNotNull(body);
        assertEquals(500, body.getStatus());
        assertEquals("Internal Server Error", body.getError());
        assertFalse(body.getMessage().contains("secret.json"));
        assertEquals("An unexpected server error occurred. Please contact system administrator.", body.getMessage());
    }
}

