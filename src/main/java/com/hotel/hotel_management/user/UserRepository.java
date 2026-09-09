package com.hotel.hotel_management.user;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.hotel.hotel_management.auth.RegisterRequest;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class UserRepository {

    private final Firestore firestore;

    public UserRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Optional<User> findByUid(String uid) {
        try {
            DocumentSnapshot document = firestore.collection("users")
                    .document(uid)
                    .get()
                    .get();
            return document.exists() ? Optional.of(toUser(document)) : Optional.empty();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to read user profile from Firestore", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to read user profile from Firestore", exception);
        }
    }

    public void saveProfile(String uid, RegisterRequest request) {
        Instant now = Instant.now();
        Map<String, Object> profile = new HashMap<>();
        profile.put("uid", uid);
        profile.put("email", request.getEmail());
        profile.put("firstName", request.getFirstName());
        profile.put("lastName", request.getLastName());
        profile.put("phone", request.getPhone());
        profile.put("role", "CUSTOMER");
        profile.put("enabled", true);
        profile.put("createdAt", Date.from(now));
        profile.put("updatedAt", Date.from(now));

        try {
            firestore.collection("users").document(uid).set(profile).get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save user profile to Firestore", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save user profile to Firestore", exception);
        }
    }

    private User toUser(DocumentSnapshot document) {
        User user = new User();
        user.setUid(document.getId());
        user.setEmail(document.getString("email"));
        user.setFirstName(document.getString("firstName"));
        user.setLastName(document.getString("lastName"));
        user.setPhone(document.getString("phone"));
        user.setRole(document.getString("role"));
        user.setEnabled(Boolean.TRUE.equals(document.getBoolean("enabled")));
        user.setCreatedAt(toInstant(document.getDate("createdAt")));
        user.setUpdatedAt(toInstant(document.getDate("updatedAt")));
        return user;
    }

    private Instant toInstant(Date value) {
        return value == null ? null : value.toInstant();
    }
    
    public java.util.List<User> findAll() {
    try {
        return firestore.collection("users")
                .get()
                .get()
                .getDocuments()
                .stream()
                .map(this::toUser)
                .toList();
    } catch (InterruptedException exception) {
        Thread.currentThread().interrupt();
        throw new IllegalStateException(
                "Unable to read users from Firestore", exception);
    } catch (ExecutionException exception) {
        throw new IllegalStateException(
                "Unable to read users from Firestore", exception);
    }
}
}
