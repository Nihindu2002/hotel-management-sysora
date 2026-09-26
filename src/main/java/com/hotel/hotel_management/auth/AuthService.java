package com.hotel.hotel_management.auth;

import com.google.firebase.auth.FirebaseAuth;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    private final FirebaseAuth firebaseAuth;
    private final RestClient restClient;
    private final String firebaseApiKey;

    public AuthService(
            FirebaseAuth firebaseAuth,
            @Value("${firebase.api-key}") String firebaseApiKey) {

        this.firebaseAuth = firebaseAuth;
        this.firebaseApiKey = firebaseApiKey;
        this.restClient = RestClient.create();
    }

    public LoginResponse login(LoginRequest request) {

        String url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="
                + firebaseApiKey;

        LoginFirebaseRequest firebaseRequest =
                new LoginFirebaseRequest(
                        request.email(),
                        request.password(),
                        true
                );

        try {
            LoginFirebaseResponse response = restClient.post()
                    .uri(url)
                    .body(firebaseRequest)
                    .retrieve()
                    .body(LoginFirebaseResponse.class);

            return new LoginResponse(
                    "Login successful",
                    response.idToken(),
                    response.refreshToken(),
                    response.localId(),
                    response.email(),
                    response.expiresIn()
            );
        } catch (RestClientResponseException exception) {
            logger.warn("Firebase sign-in failed for email {}: status={}, body={}",
                    request.email(), exception.getStatusCode(), exception.getResponseBodyAsString());

            if (exception.getStatusCode().is4xxClientError()) {
                throw new ResponseStatusException(
                        HttpStatus.UNAUTHORIZED,
                        "Invalid email or password",
                        exception
                );
            }

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Unable to authenticate user",
                    exception
            );
        }
    }
}