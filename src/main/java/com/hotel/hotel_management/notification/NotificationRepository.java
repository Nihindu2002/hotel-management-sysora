package com.hotel.hotel_management.notification;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class NotificationRepository {

    private static final String COLLECTION = "notifications";

    private final Firestore firestore;

    public NotificationRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public Notification save(Notification notification) {
        DocumentReference document = firestore.collection(COLLECTION)
                .document(notification.getNotificationId());

        Map<String, Object> data = new HashMap<>();
        data.put("notificationId", notification.getNotificationId());
        data.put("userUid", notification.getUserUid());
        data.put("title", notification.getTitle());
        data.put("message", notification.getMessage());
        data.put("type", notification.getType() != null ? notification.getType().name() : null);
        data.put("isRead", notification.isRead());
        data.put("link", notification.getLink());
        data.put("referenceId", notification.getReferenceId());
        data.put("createdAt", notification.getCreatedAt() != null
                ? Date.from(notification.getCreatedAt())
                : Date.from(Instant.now()));

        try {
            document.set(data).get();
            return notification;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to save notification", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to save notification", exception);
        }
    }

    public Optional<Notification> findById(String notificationId) {
        try {
            DocumentSnapshot snapshot = firestore.collection(COLLECTION)
                    .document(notificationId)
                    .get()
                    .get();

            return snapshot.exists() ? Optional.of(toNotification(snapshot)) : Optional.empty();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find notification by id", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find notification by id", exception);
        }
    }

    /**
     * All notifications addressed to one user.
     *
     * Filtered and sorted in memory rather than with a Firestore orderBy, which
     * would require a composite index on (userUid, createdAt) to be provisioned
     * per project. Volumes here are small and per-user.
     */
    public List<Notification> findByUserUid(String userUid) {
        try {
            var documents = firestore.collection(COLLECTION)
                    .whereEqualTo("userUid", userUid)
                    .get()
                    .get()
                    .getDocuments();

            List<Notification> list = new ArrayList<>();
            for (var snapshot : documents) {
                list.add(toNotification(snapshot));
            }

            list.sort((a, b) -> {
                Instant left = a.getCreatedAt();
                Instant right = b.getCreatedAt();
                if (left == null && right == null) return 0;
                if (left == null) return 1;
                if (right == null) return -1;
                return right.compareTo(left);
            });

            return list;
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to find notifications for user", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to find notifications for user", exception);
        }
    }

    public Notification updateReadStatus(String notificationId, boolean isRead) {
        try {
            firestore.collection(COLLECTION)
                    .document(notificationId)
                    .update("isRead", isRead)
                    .get();

            return findById(notificationId)
                    .orElseThrow(() -> new IllegalStateException("Notification not found"));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to update notification", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to update notification", exception);
        }
    }

    /** Marks every unread notification in the list read, in one batch. */
    public int markAllRead(List<Notification> notifications) {
        List<Notification> unread = notifications.stream()
                .filter(notification -> !notification.isRead())
                .toList();

        if (unread.isEmpty()) {
            return 0;
        }

        try {
            WriteBatch batch = firestore.batch();
            for (Notification notification : unread) {
                batch.update(
                        firestore.collection(COLLECTION).document(notification.getNotificationId()),
                        "isRead", true);
            }
            batch.commit().get();
            return unread.size();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to mark notifications as read", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to mark notifications as read", exception);
        }
    }

    public void delete(String notificationId) {
        try {
            firestore.collection(COLLECTION).document(notificationId).delete().get();
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Unable to delete notification", exception);
        } catch (ExecutionException exception) {
            throw new IllegalStateException("Unable to delete notification", exception);
        }
    }

    private Notification toNotification(DocumentSnapshot snapshot) {
        Notification notification = new Notification();
        notification.setNotificationId(snapshot.getString("notificationId"));
        notification.setUserUid(snapshot.getString("userUid"));
        notification.setTitle(snapshot.getString("title"));
        notification.setMessage(snapshot.getString("message"));

        String type = snapshot.getString("type");
        if (type != null) {
            notification.setType(NotificationType.valueOf(type));
        }

        Boolean isRead = snapshot.getBoolean("isRead");
        notification.setRead(isRead != null && isRead);

        notification.setLink(snapshot.getString("link"));
        notification.setReferenceId(snapshot.getString("referenceId"));

        if (snapshot.getTimestamp("createdAt") != null) {
            notification.setCreatedAt(snapshot.getTimestamp("createdAt").toDate().toInstant());
        }

        return notification;
    }
}
