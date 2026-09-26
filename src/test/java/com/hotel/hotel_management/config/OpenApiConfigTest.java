package com.hotel.hotel_management.config;

import com.hotel.hotel_management.auth.AuthController;
import com.hotel.hotel_management.controller.TestController;
import com.hotel.hotel_management.customer.CustomerController;
import com.hotel.hotel_management.dashboard.DashboardController;
import com.hotel.hotel_management.finance.FinanceController;
import com.hotel.hotel_management.housekeeping.HousekeepingController;
import com.hotel.hotel_management.inventory.InventoryController;
import com.hotel.hotel_management.invoice.InvoiceController;
import com.hotel.hotel_management.maintenance.MaintenanceController;
import com.hotel.hotel_management.payment.PaymentController;
import com.hotel.hotel_management.reservation.ReservationController;
import com.hotel.hotel_management.room.RoomController;
import com.hotel.hotel_management.security.*;
import com.hotel.hotel_management.staff.StaffController;
import com.hotel.hotel_management.user.UserController;
import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Configuration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class OpenApiConfigTest {

    @Test
    void testOpenApiConfigAnnotations() {
        Class<OpenApiConfig> clazz = OpenApiConfig.class;

        assertTrue(clazz.isAnnotationPresent(Configuration.class), "OpenApiConfig must be annotated with @Configuration");
        assertTrue(clazz.isAnnotationPresent(OpenAPIDefinition.class), "OpenApiConfig must be annotated with @OpenAPIDefinition");
        assertTrue(clazz.isAnnotationPresent(SecurityScheme.class), "OpenApiConfig must be annotated with @SecurityScheme");

        OpenAPIDefinition definition = clazz.getAnnotation(OpenAPIDefinition.class);
        assertEquals("Hotel Management System API", definition.info().title());
        assertEquals("1.0.0", definition.info().version());
        assertEquals("REST API for hotel management operations.", definition.info().description());
        assertEquals(1, definition.security().length);
        assertEquals("bearerAuth", definition.security()[0].name());

        SecurityScheme scheme = clazz.getAnnotation(SecurityScheme.class);
        assertEquals("bearerAuth", scheme.name());
        assertEquals(SecuritySchemeType.HTTP, scheme.type());
        assertEquals("bearer", scheme.scheme());
        assertEquals("Firebase ID Token", scheme.bearerFormat());
    }

    @Test
    void testCoreControllersHaveTagAnnotations() {
        List<Class<?>> coreControllers = List.of(
                AuthController.class,
                UserController.class,
                RoomController.class,
                ReservationController.class,
                InvoiceController.class,
                PaymentController.class,
                HousekeepingController.class,
                MaintenanceController.class,
                InventoryController.class,
                StaffController.class,
                FinanceController.class,
                DashboardController.class,
                CustomerController.class
        );

        for (Class<?> controller : coreControllers) {
            assertTrue(
                    controller.isAnnotationPresent(Tag.class),
                    controller.getSimpleName() + " should be annotated with @Tag"
            );
            Tag tag = controller.getAnnotation(Tag.class);
            assertFalse(tag.name().isBlank(), controller.getSimpleName() + " @Tag name should not be blank");
        }
    }

    @Test
    void testInternalTestControllersAreHidden() {
        List<Class<?>> testControllers = List.of(
                TestController.class,
                AdminTestController.class,
                RbacTestController.class,
                SecurityTestController.class
        );

        for (Class<?> controller : testControllers) {
            assertTrue(
                    controller.isAnnotationPresent(Hidden.class),
                    controller.getSimpleName() + " should be annotated with @Hidden"
            );
        }
    }
}

