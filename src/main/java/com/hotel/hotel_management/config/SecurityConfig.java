package com.hotel.hotel_management.config;

import com.hotel.hotel_management.security.FirebaseAuthenticationFilter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
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
                                "/api/auth/login"
                        ).permitAll()

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

                        .requestMatchers(HttpMethod.POST, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(HttpMethod.GET, "/api/reservations")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST")

                        .requestMatchers(HttpMethod.GET, "/api/reservations/my")
                        .hasRole("CUSTOMER")

                        .requestMatchers(HttpMethod.GET, "/api/reservations/*")
                        .hasAnyRole("ADMIN", "MANAGER", "RECEPTIONIST", "CUSTOMER")

                        .requestMatchers(
                                HttpMethod.PATCH,
                                "/api/reservations/*/cancel-by-staff"
                        )
                        .hasAnyRole("ADMIN", "MANAGER")

                        .requestMatchers("/api/housekeeping/**")
                        .hasAnyRole("ADMIN", "MANAGER", "HOUSEKEEPING")

                        .requestMatchers("/api/finance/**", "/api/accountant/**")
                        .hasAnyRole("ADMIN", "MANAGER", "ACCOUNTANT")

                        .requestMatchers("/api/customer/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers("/api/staff/**")
                        .hasAnyRole("ADMIN", "MANAGER", "STAFF")

                        .anyRequest().authenticated()
                )

                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, exception) -> {
                            response.setStatus(HttpStatus.UNAUTHORIZED.value());
                            response.setContentType("application/json");
                            response.getWriter().write("{\"status\":401,\"message\":\"Invalid or missing Firebase ID token\"}");
                        })
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(HttpStatus.FORBIDDEN.value());
                            response.setContentType("application/json");
                            response.getWriter().write("{\"status\":403,\"message\":\"Access denied\"}");
                        })
                )

                .addFilterBefore(
                        firebaseAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}