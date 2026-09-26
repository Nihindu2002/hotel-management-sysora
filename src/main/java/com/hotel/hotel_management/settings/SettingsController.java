package com.hotel.hotel_management.settings;

import com.hotel.hotel_management.invoice.BillingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Settings", description = "Read-only property configuration")
@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final BillingService billingService;

    public SettingsController(BillingService billingService) {
        this.billingService = billingService;
    }

    @Operation(summary = "Get property settings",
            description = "Reports the configuration the application is running with, "
                    + "such as the tax rate applied to final bills")
    @GetMapping
    public ResponseEntity<SettingsResponse> getSettings() {

        return ResponseEntity.ok(
                new SettingsResponse(billingService.getTaxPercentage()));
    }
}
