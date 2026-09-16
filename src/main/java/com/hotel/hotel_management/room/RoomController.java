package com.hotel.hotel_management.room;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Tag(name = "Rooms", description = "Hotel room management and image uploads")
@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @Operation(summary = "Get all rooms", description = "Retrieves a list of all hotel rooms")
    @GetMapping
    public List<Room> getAllRooms() {
        return roomService.getAllRooms();
    }

    @Operation(summary = "Get room by ID", description = "Retrieves room details by roomId")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Room found"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @GetMapping("/{roomId}")
    public Room getRoomById(@PathVariable String roomId) {
        return roomService.getRoomById(roomId);
    }

    @Operation(summary = "Create a room", description = "Creates a new hotel room (Admin / Manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Room created successfully"),
            @ApiResponse(responseCode = "400", description = "Validation error")
    })
    @PostMapping
    public ResponseEntity<Room> createRoom(@RequestBody Room room) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(roomService.createRoom(room));
    }

    @Operation(summary = "Update a room", description = "Updates details of an existing room (Admin / Manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Room updated successfully"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @PutMapping("/{roomId}")
    public Room updateRoom(
            @PathVariable String roomId,
            @RequestBody Room room) {

        return roomService.updateRoom(roomId, room);
    }

    @Operation(summary = "Update room status", description = "Updates operational status of a room (Admin / Manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Room status updated"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @PatchMapping("/{roomId}/status")
    public Room updateRoomStatus(
            @PathVariable String roomId,
            @jakarta.validation.Valid @RequestBody UpdateRoomStatusRequest request) {

        return roomService.updateRoomStatus(
                roomId,
                request.status()
        );
    }

    @Operation(summary = "Upload room image", description = "Uploads a photo to Cloudinary and attaches URL to room (Admin / Manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Image uploaded"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
    @PostMapping(value = "/{roomId}/images", consumes = "multipart/form-data")
    public Room uploadRoomImage(
            @PathVariable String roomId,
            @RequestParam("file") MultipartFile file) {

        return roomService.addRoomImage(roomId, file);
    }

    @Operation(summary = "Delete room image", description = "Deletes a photo from Cloudinary and removes URL from room (Admin / Manager)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Image deleted"),
            @ApiResponse(responseCode = "404", description = "Room not found")
    })
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

