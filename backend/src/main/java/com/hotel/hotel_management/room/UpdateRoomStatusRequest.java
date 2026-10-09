package com.hotel.hotel_management.room;

import jakarta.validation.constraints.NotNull;

public record UpdateRoomStatusRequest(
        @NotNull RoomStatus status
) {
}