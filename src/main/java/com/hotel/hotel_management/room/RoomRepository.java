package com.hotel.hotel_management.room;

import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ExecutionException;

@Repository
public class RoomRepository {

    private final Firestore firestore;

    /**
     * Rooms are read constantly and written rarely: the public listing, the
     * booking search, almost every dashboard and the housekeeping and
     * maintenance task forms all call findAll, and each call was a separate
     * full-collection round trip to Firestore.
     *
     * A short TTL collapses those to one. Every write method below clears it,
     * so an edit is visible on the very next read rather than up to a minute
     * later — the cache is never the reason stale data shows up.
     */
    private volatile List<Room> allRoomsCache = null;
    private volatile long allRoomsCacheExpiry = 0L;
    private static final long CACHE_TTL_MS = 60 * 1000L;
    private final Object cacheLock = new Object();

    public RoomRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    /**
     * Drops the cached list so the next read goes back to Firestore. Called by
     * every method that writes, which is what keeps this safe to use.
     */
    public void clearCache() {
        allRoomsCache = null;
        allRoomsCacheExpiry = 0L;
    }

    private boolean cacheIsWarm() {
        return allRoomsCache != null && System.currentTimeMillis() < allRoomsCacheExpiry;
    }

    public List<Room> findAll() {
        if (cacheIsWarm()) {
            return allRoomsCache;
        }

        // Serialise the refill so a cold cache costs one fetch rather than one
        // per concurrent request; whoever loses the race re-reads the field the
        // winner just populated.
        synchronized (cacheLock) {
            if (cacheIsWarm()) {
                return allRoomsCache;
            }

            List<Room> rooms = readAllFromFirestore();
            allRoomsCache = rooms;
            allRoomsCacheExpiry = System.currentTimeMillis() + CACHE_TTL_MS;
            return rooms;
        }
    }

    private List<Room> readAllFromFirestore() {
        try {
            return firestore.collection("rooms")
                    .get()
                    .get()
                    .getDocuments()
                    .stream()
                    .map(this::toRoom)
                    .toList();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read rooms from Firestore", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read rooms from Firestore", exception);
        }
    }

    public Optional<Room> findById(String roomId) {
        // Serving single-room reads from the warmed list avoids a round trip
        // each. Safe because writes clear the cache, so a room created since
        // the list was filled cannot be missing from it.
        if (cacheIsWarm()) {
            return allRoomsCache.stream()
                    .filter(room -> roomId.equals(room.getRoomId()))
                    .findFirst();
        }

        try {
            DocumentSnapshot document = firestore
                    .collection("rooms")
                    .document(roomId)
                    .get()
                    .get();

            return document.exists()
                    ? Optional.of(toRoom(document))
                    : Optional.empty();

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to read room from Firestore", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to read room from Firestore", exception);
        }
    }

    public Room save(Room room) {

        Instant now = Instant.now();

        if (room.getCreatedAt() == null) {
            room.setCreatedAt(now);
        }

        room.setUpdatedAt(now);

        Map<String, Object> data = new HashMap<>();

        data.put("roomId", room.getRoomId());
        data.put("roomNumber", room.getRoomNumber());
        data.put("roomType", room.getRoomType().name());
        data.put("floor", room.getFloor());
        data.put("pricePerNight", room.getPricePerNight());
        data.put("status", room.getStatus().name());
        data.put("images",
                room.getImages() == null
                        ? List.of()
                        : room.getImages());
        data.put("createdAt", Date.from(room.getCreatedAt()));
        data.put("updatedAt", Date.from(room.getUpdatedAt()));

        try {
            firestore.collection("rooms")
                    .document(room.getRoomId())
                    .set(data)
                    .get();

            return room;

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to save room to Firestore", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to save room to Firestore", exception);
        }
    }

    public Room updateRoom(String roomId, Room room) {
        try {
            Map<String, Object> updates = new HashMap<>();

            updates.put("roomNumber", room.getRoomNumber());
            updates.put("roomType", room.getRoomType().name());
            updates.put("floor", room.getFloor());
            updates.put("pricePerNight", room.getPricePerNight());
            updates.put("updatedAt", Date.from(Instant.now()));

            firestore.collection("rooms")
                    .document(roomId)
                    .update(updates)
                    .get();

            return findById(roomId)
                    .orElseThrow(() ->
                            new IllegalStateException("Room not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update room", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update room", exception);
        }
    }

    public Room updateStatus(String roomId, RoomStatus status) {

        try {
            Map<String, Object> updates = new HashMap<>();

            updates.put("status", status.name());
            updates.put("updatedAt", Date.from(Instant.now()));

            firestore.collection("rooms")
                    .document(roomId)
                    .update(updates)
                    .get();

            return findById(roomId)
                    .orElseThrow(() ->
                            new IllegalStateException("Room not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update room status", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update room status", exception);
        }
    }

    public Room updateImages(String roomId, List<String> images) {

        DocumentReference document =
                firestore.collection("rooms").document(roomId);

        Map<String, Object> updates = new HashMap<>();
        updates.put("images", images);
        updates.put("updatedAt", Instant.now());

        try {
            document.update(updates).get();

            return findById(roomId)
                    .orElseThrow(() ->
                            new IllegalArgumentException("Room not found"));

        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(
                    "Unable to update room images", exception);

        } catch (ExecutionException exception) {
            throw new IllegalStateException(
                    "Unable to update room images", exception);
        }
    }

    private Room toRoom(DocumentSnapshot document) {

        Room room = new Room();

        room.setRoomId(document.getId());
        room.setRoomNumber(document.getString("roomNumber"));

        String roomType = document.getString("roomType");
        if (roomType != null) {
            room.setRoomType(RoomType.valueOf(roomType));
        }

        room.setFloor(document.getLong("floor") == null
                ? null
                : document.getLong("floor").intValue());

        room.setPricePerNight(document.getDouble("pricePerNight"));

        String status = document.getString("status");
        if (status != null) {
            room.setStatus(RoomStatus.valueOf(status));
        }

        List<String> images = (List<String>) document.get("images");

        if (images != null) {
            room.setImages(images);
        } else {
            room.setImages(List.of());
        }

        room.setCreatedAt(toInstant(document.getDate("createdAt")));
        room.setUpdatedAt(toInstant(document.getDate("updatedAt")));

        return room;
    }

    private Instant toInstant(Date value) {
        return value == null ? null : value.toInstant();
    }

    
}