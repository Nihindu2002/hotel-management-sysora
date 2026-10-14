package com.hotel.hotel_management.storage;

import com.hotel.hotel_management.auth.AuthRepository;
import com.hotel.hotel_management.auth.AuthService;
import com.hotel.hotel_management.auth.LoginRequest;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class PostgresDocumentStoreIntegrationTest {
    @Autowired private PostgresDocumentStore documents;
    @Autowired private AuthRepository auth;
    @Autowired private AuthService authService;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void documentCrudAndSessionRevocationWorkAgainstPostgres() throws Exception {
        String id = "migration-smoke-" + UUID.randomUUID();
        String email = id + "@example.invalid";
        var document = documents.collection("migrationSmokeTests").document(id);
        String token = null;
        try {
            users.createProfile(id, email, "Test", "Account", null, Role.RECEPTIONIST);
            document.set(Map.of("uid", id, "email", email, "enabled", true, "name", "Test record")).get();
            var stored = document.get().get();
            assertTrue(stored.exists());
            assertEquals(email, stored.getString("email"));
            assertTrue(stored.getBoolean("enabled"));
            assertEquals(1, documents.collection("migrationSmokeTests")
                    .whereEqualTo("email", email).get().get().getDocuments().size());

            document.update(Map.of("name", "Updated record")).get();
            assertEquals("Updated record", document.get().get().getString("name"));

            auth.createAccount(id, email, passwordEncoder.encode("StrongPass1!"));
            String originalToken = authService.login(new LoginRequest(email, "StrongPass1!")).idToken();
            assertEquals(id, auth.findUidForToken(originalToken).orElseThrow());
            authService.changePassword(id, "StrongPass1!", "NewStrongPass2!");
            assertFalse(auth.findUidForToken(originalToken).isPresent());
            token = authService.login(new LoginRequest(email, "NewStrongPass2!")).idToken();
            assertEquals(id, auth.findUidForToken(token).orElseThrow());
            String resetToken = token;
            authService.logout(token);
            token = null;
            assertFalse(auth.findUidForToken(resetToken).isPresent());

            document.delete().get();
            assertFalse(document.get().get().exists());
        } finally {
            if (token != null) auth.revokeSession(token);
            jdbc.update("delete from hotel_auth_accounts where uid = ?", id);
            jdbc.update("delete from hotel_documents where collection_name = ? and document_id = ?",
                    "migrationSmokeTests", id);
        }
    }
}
