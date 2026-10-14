package com.hotel.hotel_management.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Configuration
public class DatabaseConfig {
    @Bean
    public HikariDataSource dataSource(
            @Value("${NEON_DATABASE_URL}") String connectionUrl,
            @Value("${DB_POOL_SIZE:5}") int poolSize) {
        try {
            String normalized = connectionUrl.trim();
            if (normalized.startsWith("jdbc:")) normalized = normalized.substring("jdbc:".length());
            URI uri = URI.create(normalized);
            if (!"postgresql".equals(uri.getScheme()) || uri.getHost() == null) {
                throw new IllegalArgumentException("URL must use the PostgreSQL scheme and include a host");
            }

            String username = null;
            String password = null;
            List<String> query = new ArrayList<>();
            if (uri.getRawQuery() != null) {
                for (String part : uri.getRawQuery().split("&")) {
                    String[] pair = part.split("=", 2);
                    String key = decode(pair[0]);
                    String value = pair.length == 2 ? pair[1] : "";
                    if (key.equalsIgnoreCase("user") || key.equalsIgnoreCase("username")) username = decode(value);
                    else if (key.equalsIgnoreCase("password")) password = decode(value);
                    else query.add(part);
                }
            }
            if (uri.getRawUserInfo() != null) {
                String[] credentials = uri.getRawUserInfo().split(":", 2);
                username = decode(credentials[0]);
                if (credentials.length == 2) password = decode(credentials[1]);
            }

            String host = uri.getHost().contains(":") ? "[" + uri.getHost() + "]" : uri.getHost();
            String jdbcUrl = "jdbc:postgresql://" + host
                    + (uri.getPort() < 0 ? "" : ":" + uri.getPort())
                    + (uri.getRawPath() == null ? "" : uri.getRawPath())
                    + (query.isEmpty() ? "" : "?" + String.join("&", query));

            HikariDataSource dataSource = new HikariDataSource();
            dataSource.setJdbcUrl(jdbcUrl);
            if (username != null) dataSource.setUsername(username);
            if (password != null) dataSource.setPassword(password);
            dataSource.setMaximumPoolSize(Math.max(1, poolSize));
            return dataSource;
        } catch (RuntimeException exception) {
            throw new IllegalArgumentException("NEON_DATABASE_URL must be a valid PostgreSQL connection URL", exception);
        }
    }

    @Bean
    public ObjectMapper objectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }

    private static String decode(String value) {
        return URLDecoder.decode(value.replace("+", "%2B"), StandardCharsets.UTF_8);
    }
}
