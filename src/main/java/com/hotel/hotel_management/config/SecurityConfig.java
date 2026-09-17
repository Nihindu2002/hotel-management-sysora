package com.hotel.hotel_management.config;

import com.hotel.hotel_management.security.FirebaseAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;


import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    private final FirebaseAuthenticationFilter firebaseAuthenticationFilter;

    public SecurityConfig(
            FirebaseAuthenticationFilter firebaseAuthenticationFilter) {
        this.firebaseAuthenticationFilter = firebaseAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
                .cors(Customizer.withDefaults())

                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/test",
                                "/api/auth/register",
                                "/api/auth/login",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs"
                        ).permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/users/me")
                        .authenticated()

                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/users")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/users/*")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/users/*")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PATCH, "/api/users/*/role")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/rooms")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(HttpMethod.GET, "/api/rooms/*")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(HttpMethod.POST, "/api/rooms")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.PUT, "/api/rooms/*")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.POST, "/api/rooms/*/images")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.DELETE, "/api/rooms/*/images")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.PATCH, "/api/rooms/*/status")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers("/api/manager/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers("/api/dashboard", "/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.POST, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(HttpMethod.GET, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/reservations/my")
                        .hasRole("CUSTOMER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/reservations/availability"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(HttpMethod.GET, "/api/reservations/*")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/cancel"
                        )
                        .hasRole("CUSTOMER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/cancel-by-staff"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/confirm"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/check-in"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/check-out"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/test"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "HOUSEKEEPING")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/housekeeping/tasks"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/my"
                        )
                        .hasRole("HOUSEKEEPING")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/rooms/*/tasks"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "HOUSEKEEPING"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/tasks/*"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "HOUSEKEEPING"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/tasks"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "HOUSEKEEPING"
                        )

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/housekeeping/tasks/*/assign"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/housekeeping/tasks/*/start"
                        )
                        .hasRole("HOUSEKEEPING")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/housekeeping/tasks/*/complete"
                        )
                        .hasRole("HOUSEKEEPING")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/housekeeping/tasks/*/cancel"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/maintenance/tasks"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/maintenance/dashboard"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/maintenance/my"
                        )
                        .hasRole("MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/maintenance/rooms/*/tasks"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/maintenance/tasks/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/maintenance/tasks"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/maintenance/tasks/*/assign"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/maintenance/tasks/*/start"
                        )
                        .hasRole("MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/maintenance/tasks/*/complete"
                        )
                        .hasRole("MAINTENANCE")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/maintenance/tasks/*/cost"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/maintenance/tasks/*/cancel"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/dashboard"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "STAFF",
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/low-stock"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "STAFF",
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/transactions"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/items/*/transactions"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/stock-in"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/stock-out"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/adjustment"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/items"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/inventory/items/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/inventory/items/*/deactivate"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/items/*"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "STAFF",
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/items"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
                                "STAFF",
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        .requestMatchers("/api/finance", "/api/finance/**", "/api/accountant/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        .requestMatchers("/api/customer", "/api/customer/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/staff"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/staff/*/status"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.PUT,
                                "/api/staff/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/staff/*"
                        )
                        .hasRole("ADMIN")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/staff",
                                "/api/staff/*",
                                "/api/staff/user/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")


                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/invoices/reservation/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/invoices/*/amounts"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/invoices/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/invoices/my"
                        )
                        .hasRole("CUSTOMER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/invoices"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/invoices/*",
                                "/api/invoices/reservation/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/payments"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/payments/*/refund"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments/*/status"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT", "CUSTOMER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments/my"
                        )
                        .hasRole("CUSTOMER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments/invoice/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .anyRequest().authenticated()
                )

                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType("application/json");
                            String json = formatApiErrorJson(
                                    HttpStatus.UNAUTHORIZED.value(),
                                    "Unauthorized",
                                    "Invalid or missing Firebase ID token",
                                    request.getRequestURI()
                            );
                            response.getWriter().write(json);
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType("application/json");
                            String json = formatApiErrorJson(
                                    HttpStatus.FORBIDDEN.value(),
                                    "Forbidden",
                                    "Access denied",
                                    request.getRequestURI()
                            );
                            response.getWriter().write(json);
                        })
                )

                .addFilterBefore(
                        firebaseAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    private String formatApiErrorJson(int status, String error, String message, String path) {
        String safePath = path != null ? path.replace("\"", "\\\"") : "";
        String safeMessage = message != null ? message.replace("\"", "\\\"") : "";
        String timestamp = java.time.Instant.now().toString();
        return String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"error\":\"%s\",\"message\":\"%s\",\"path\":\"%s\"}",
                timestamp, status, error, safeMessage, safePath
        );
    }
}