package com.hotel.hotel_management.user;

import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Repository
public class UserRepository {

    private final Firestore firestore;
    private final Map<String, CachedUser> userCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    private record CachedUser(User user, long expiryTime) {}

    public UserRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Optional<User> findByUid(String uid) {
        if (uid == null) {
            return Optional.empty();
        }

        CachedUser cached = userCache.get(uid);
        if (cached != null && System.currentTimeMillis() < cached.expiryTime()) {
            return Optional.of(cached.user());
        }

        try {
            DocumentSnapshot document = firestore.collection("users")
                    .document(uid)
                    .get()
                    .get();
            if (document.exists()) {
                User user = toUser(document);
                userCache.put(uid, new CachedUser(user, System.currentTimeMillis() + CACHE_TTL_MS));
                return Optional.of(user);
            } else {
                userCache.remove(uid);
                return Optional.empty();
            }
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to read user profile from Firestore", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to read user profile from Firestore", exception);
        }
    }

    /**
     * Writes a new staff profile. The Firebase Auth account is created by the
     * caller first, so {@code uid} always refers to an existing login.
     */
    public User createProfile(
            String uid,
            String email,
            String firstName,
            String lastName,
            String phone,
            Role role) {

        Instant now = Instant.now();

        Map<String, Object> profile = new HashMap<>();
        profile.put("uid", uid);
        profile.put("email", email);
        profile.put("firstName", firstName);
        profile.put("lastName", lastName);
        profile.put("phone", phone);
        profile.put("role", role.name());
        profile.put("enabled", true);
        profile.put("createdAt", Date.from(now));
        profile.put("updatedAt", Date.from(now));

        try {
            firestore.collection("users").document(uid).set(profile).get();
            userCache.remove(uid);

            return findByUid(uid)
                    .orElseThrow(() ->
                            new IllegalStateException("User not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save user profile to Firestore", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save user profile to Firestore", exception);
        }
    }

    public User updateProfile(String uid, UpdateUserRequest request) {
        try {
            var documentReference = firestore
                    .collection("users")
                    .document(uid);

            Map<String, Object> updates = new HashMap<>();

            updates.put("firstName", request.firstName());
            updates.put("lastName", request.lastName());
            updates.put("phone", request.phone());
            updates.put("updatedAt", Date.from(Instant.now()));

            documentReference.update(updates).get();
            userCache.remove(uid);

            return findByUid(uid)
                    .orElseThrow(() ->
                            new IllegalStateException("User not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update user in Firestore", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update user in Firestore", exception);
        }
    }

    public User updateRole(String uid, Role role) {
        try {
            Map<String, Object> updates = new HashMap<>();
            updates.put("role", role.name());
            updates.put("updatedAt", Date.from(Instant.now()));

            firestore.collection("users")
                    .document(uid)
                    .update(updates)
                    .get();
            userCache.remove(uid);

            return findByUid(uid)
                    .orElseThrow(() ->
                            new IllegalStateException("User not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update user role", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update user role", exception);
        }
    }

    public void invalidateCache(String uid) {
        if (uid != null) {
            userCache.remove(uid);
        }
    }

    public void clearCache() {
        userCache.clear();
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
