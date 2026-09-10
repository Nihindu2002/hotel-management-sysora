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

    public RoomRepository(Firestore firestore) {
        this.firestore = firestore;
    }

    public List<Room> findAll() {
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