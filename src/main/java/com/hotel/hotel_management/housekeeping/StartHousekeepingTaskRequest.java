package com.hotel.hotel_management.housekeeping;

import java.util.List;

public record StartHousekeepingTaskRequest(
        @jakarta.validation.Valid List<InventoryItemUsage> items) {}
