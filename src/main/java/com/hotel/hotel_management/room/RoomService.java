package com.hotel.hotel_management.room;

import com.hotel.hotel_management.exception.ConflictException;
import com.hotel.hotel_management.exception.ResourceNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomImageService roomImageService;

    public RoomService(
            RoomRepository roomRepository,
            RoomImageService roomImageService) {

        this.roomRepository = roomRepository;
        this.roomImageService = roomImageService;
    }

    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    public Room getRoomById(String roomId) {
        return roomRepository.findById(roomId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));
    }

    public Room createRoom(Room room) {

        if (room.getRoomId() == null || room.getRoomId().isBlank()) {
            throw new IllegalArgumentException("Room ID is required");
        }

        if (room.getRoomNumber() == null || room.getRoomNumber().isBlank()) {
            throw new IllegalArgumentException("Room number is required");
        }

        if (room.getRoomType() == null) {
            throw new IllegalArgumentException("Room type is required");
        }

        if (room.getFloor() == null) {
            throw new IllegalArgumentException("Floor is required");
        }

        if (room.getPricePerNight() == null || room.getPricePerNight() < 0) {
            throw new IllegalArgumentException(
                    "Price per night must be greater than or equal to 0");
        }

        if (room.getStatus() == null) {
            room.setStatus(RoomStatus.AVAILABLE);
        }

        if (roomRepository.findById(room.getRoomId()).isPresent()) {
            throw new ConflictException("Room already exists");
        }

        Room saved = roomRepository.save(room);
        roomRepository.clearCache();
        return saved;
    }

    public Room updateRoom(String roomId, Room room) {

        if (room.getRoomNumber() == null || room.getRoomNumber().isBlank()) {
            throw new IllegalArgumentException("Room number is required");
        }

        if (room.getRoomType() == null) {
            throw new IllegalArgumentException("Room type is required");
        }

        if (room.getFloor() == null) {
            throw new IllegalArgumentException("Floor is required");
        }

        if (room.getPricePerNight() == null || room.getPricePerNight() < 0) {
            throw new IllegalArgumentException(
                    "Price per night must be greater than or equal to 0");
        }

        Room updated = roomRepository.updateRoom(roomId, room);
        roomRepository.clearCache();
        return updated;
    }

    public Room updateRoomStatus(String roomId, RoomStatus status) {

    if (status == null) {
        throw new IllegalArgumentException("Room status is required");
    }

    if (roomRepository.findById(roomId).isEmpty()) {
        throw new ResourceNotFoundException("Room not found");
    }

    Room updated = roomRepository.updateStatus(roomId, status);
    roomRepository.clearCache();
    return updated;
    }

    public Room addRoomImage(
            String roomId,
            MultipartFile file) {

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Room not found"));

        String imageUrl =
                roomImageService.uploadImage(roomId, file);

        List<String> images = room.getImages() == null
                ? new ArrayList<>()
                : new ArrayList<>(room.getImages());

        images.add(imageUrl);

        Room updated = roomRepository.updateImages(roomId, images);
    roomRepository.clearCache();
    return updated;
    }

    public Room deleteRoomImage(
        String roomId,
        String imageUrl) {

    Room room = roomRepository.findById(roomId)
            .orElseThrow(() ->
                    new IllegalArgumentException("Room not found"));

    List<String> images = room.getImages() == null
            ? new ArrayList<>()
            : new ArrayList<>(room.getImages());

    if (!images.remove(imageUrl)) {
        throw new IllegalArgumentException(
                "Image not found in this room");
    }

    roomImageService.deleteImage(imageUrl);

    Room updated = roomRepository.updateImages(roomId, images);
    roomRepository.clearCache();
    return updated;
}

}