package com.hotel.hotel_management.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class CorsConfig {

    private static final List<String> VERCEL_ORIGIN_PATTERNS = List.of(
            "https://hotel-management-sysora.vercel.app",
            "https://hotel-management-sysora-*.vercel.app");

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String allowedOriginPatterns;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins = Arrays.stream(allowedOriginPatterns.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .collect(Collectors.toList());
        // Render environment variables replace the property default entirely.
        // Always retain this app's Vercel origins so a custom Render allowlist
        // cannot accidentally break production or preview deployments.
        VERCEL_ORIGIN_PATTERNS.stream()
                .filter(origin -> !origins.contains(origin))
                .forEach(origins::add);
        configuration.setAllowedOriginPatterns(origins);
        configuration.setAllowedMethods(List.of(
                "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Authorization", "Content-Type"));
        configuration.setAllowCredentials(true);

        // Without this, Spring never writes Access-Control-Max-Age, so the
        // browser caches no preflight and every authenticated call costs an
        // extra OPTIONS round trip before the real request. An hour is safe:
        // the allowed origin/methods/headers only change on a redeploy.
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }
}

