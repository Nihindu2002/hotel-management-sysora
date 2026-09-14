package com.hotel.hotel_management.room;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    @GetMapping("/{roomId}")
    public Room getRoomById(@PathVariable String roomId) {
        return roomService.getRoomById(roomId);
    }

    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(roomService.createRoom(room));
    }

    @PutMapping("/{roomId}")
    public Room updateRoom(
            @PathVariable String roomId,
            @RequestBody Room room) {

        return roomService.updateRoom(roomId, room);
    }

    @PatchMapping("/{roomId}/status")
    public Room updateRoomStatus(
        @PathVariable String roomId,
        @jakarta.validation.Valid @RequestBody UpdateRoomStatusRequest request) {

    return roomService.updateRoomStatus(
            roomId,
            request.status()
    );
    }

    @PostMapping("/{roomId}/images")
    public Room uploadRoomImage(
            @PathVariable String roomId,
            @RequestParam("file") MultipartFile file) {

        return roomService.addRoomImage(roomId, file);
    }

    @DeleteMapping("/{roomId}/images")
public Room deleteRoomImage(
        @PathVariable String roomId,
        @RequestParam("imageUrl") String imageUrl) {

    return roomService.deleteRoomImage(
            roomId,
            imageUrl
    );
}
}

