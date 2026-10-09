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

/**
 * Role-based access for a staff-only application.
 *
 * Rules are evaluated top to bottom and the first match wins, so every narrower
 * rule has to sit above the broader one it specialises. Two consequences worth
 * keeping in mind when editing:
 *
 * <ul>
 *   <li>A path with no rule of its own falls through to
 *       {@code anyRequest().authenticated()} — that is, <em>every</em> signed-in
 *       role. Add an explicit rule rather than relying on the catch-all.</li>
 *   <li>{@code *} matches a single path segment, so
 *       {@code /api/reservations/*} does not cover
 *       {@code /api/reservations/{id}/check-in}. Sub-resources need their own
 *       matchers.</li>
 * </ul>
 *
 * There is no public surface beyond sign-in and the API docs: no room browsing,
 * no availability search, no customer endpoints.
 */
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
                                "/api/auth/login",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**",
                                "/v3/api-docs"
                        ).permitAll()

                        // ── Self-service profile ──
                        // Declared above the ADMIN-only /api/users/* rules below,
                        // which would otherwise match these paths. The controller
                        // reads the uid from the token, so a user can only ever
                        // reach their own profile.
                        .requestMatchers(HttpMethod.GET, "/api/users/me")
                        .authenticated()

                        .requestMatchers(HttpMethod.PUT, "/api/users/me")
                        .authenticated()

                        // Per-user by construction: the controller reads the uid
                        // from the token and the service verifies ownership, so
                        // any authenticated role may use its own mailbox.
                        .requestMatchers("/api/notifications", "/api/notifications/**")
                        .authenticated()

                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")

                        // Provisioning a staff login. ADMIN only, and the service
                        // refuses any role that is not a staff role.
                        .requestMatchers(HttpMethod.POST, "/api/users")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/users")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/users/*")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/users/*")
                        .hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PATCH, "/api/users/*/role")
                        .hasRole("ADMIN")

                        // ── Rooms ──
                        // Read access is staff-wide: housekeeping and maintenance
                        // both work from room records. Mutation stays with the
                        // roles that own the room inventory.
                        .requestMatchers(HttpMethod.GET, "/api/rooms")
                        .hasAnyRole(
                                "ADMIN", "MANAGER", "RECEPTIONIST",
                                "HOUSEKEEPING", "MAINTENANCE")

                        .requestMatchers(HttpMethod.GET, "/api/rooms/*")
                        .hasAnyRole(
                                "ADMIN", "MANAGER", "RECEPTIONIST",
                                "HOUSEKEEPING", "MAINTENANCE")

                        .requestMatchers(HttpMethod.POST, "/api/rooms")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.PUT, "/api/rooms/*")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.DELETE, "/api/rooms/*")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.POST, "/api/rooms/*/images")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.DELETE, "/api/rooms/*/images")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(HttpMethod.PATCH, "/api/rooms/*/status")
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers("/api/manager/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // ── Dashboard ──
                        // Narrower than the /api/dashboard/** catch-all below, so
                        // these must be declared first. Each grants one extra role
                        // read access to that report only.
                        .requestMatchers(HttpMethod.GET, "/api/dashboard/reservations/activity")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/dashboard/rooms/statistics")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/dashboard/invoices/outstanding")
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        // The accountant's Reports section reads these same
                        // aggregates, so reads are open to that role as well.
                        // Writes — there are none today — stay with management.
                        .requestMatchers(HttpMethod.GET, "/api/dashboard", "/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        .requestMatchers("/api/dashboard", "/api/dashboard/**")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // ── Reservations ──
                        // Booking, check-in and checkout are front-desk work.
                        // Nobody else creates or moves a stay.
                        .requestMatchers(HttpMethod.POST, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/reservations/availability"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/reservations/*/bill"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/reservations/*/bill"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/reservations/*/check-out"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/check-in"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/confirm"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/cancel-by-staff"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/reservations/*")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        // ── Housekeeping ──
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/test"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "HOUSEKEEPING")

                        // Explicitly scoped: without a rule this path would fall
                        // through to anyRequest().authenticated() and expose the
                        // housekeeping work queue to every signed-in user.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/housekeeping/dashboard"
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

                        // ── Maintenance ──
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

                        // ── Inventory ──
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/dashboard"
                        )
                        .hasAnyRole(
                                "ADMIN",
                                "MANAGER",
                                "RECEPTIONIST",
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
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/transactions"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/inventory/items/*/transactions"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/stock-in"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/stock-out"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/inventory/adjustment"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

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
                                "HOUSEKEEPING",
                                "MAINTENANCE"
                        )

                        // ── Finance ──
                        .requestMatchers("/api/finance", "/api/finance/**", "/api/accountant/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        // ── Staff records ──
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


                        // ── Invoices ──
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/invoices/reservation/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/invoices/*/recalculate"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.DELETE,
                                "/api/invoices/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

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
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        // ── Payments ──
                        .requestMatchers(
                                HttpMethod.POST,
                                "/api/payments"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

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
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/payments/*"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "ACCOUNTANT")

                        // ── Property settings ──
                        // Read-only configuration the management screens display.
                        .requestMatchers(HttpMethod.GET, "/api/settings")
                        .hasAnyRole("ADMIN", "MANAGER")

                        // ── RBAC probes ──
                        // These had no rule and answered every signed-in role from
                        // the endpoint they are supposed to guard.
                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/reception/test"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(
                                HttpMethod.GET,
                                "/api/receptionist/test"
                        )
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

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
