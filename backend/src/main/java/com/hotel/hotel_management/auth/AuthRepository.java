package com.hotel.hotel_management.auth;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

@Repository
public class AuthRepository {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Duration SESSION_LIFETIME = Duration.ofHours(8);

    private final JdbcTemplate jdbc;

    public AuthRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public record Account(String uid, String email, String passwordHash, boolean enabled) {}

    public void createAccount(String uid, String email, String passwordHash) {
        try {
            jdbc.update("insert into hotel_auth_accounts(uid, email, password_hash) values (?, ?, ?)",
                    uid, email.trim(), passwordHash);
        } catch (DuplicateKeyException exception) {
            throw new ConflictException("Email is already registered");
        }
    }

    public void createOrResetAccount(String uid, String email, String passwordHash) {
        jdbc.update("""
                insert into hotel_auth_accounts(uid, email, password_hash, enabled)
                values (?, ?, ?, true)
                on conflict (uid) do update set email = excluded.email,
                    password_hash = excluded.password_hash, enabled = true
                """, uid, email.trim(), passwordHash);
        jdbc.update("delete from hotel_auth_sessions where uid = ?", uid);
    }

    public boolean hasAccounts() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from hotel_auth_accounts)", Boolean.class));
    }

    public Optional<Account> findByEmail(String email) {
        return jdbc.query("select uid, email, password_hash, enabled from hotel_auth_accounts where lower(email) = lower(?)",
                rs -> rs.next()
                        ? Optional.of(new Account(rs.getString("uid"), rs.getString("email"),
                                rs.getString("password_hash"), rs.getBoolean("enabled")))
                        : Optional.empty(), email.trim());
    }

    public Optional<String> findUidForToken(String token) {
        String hash = hash(token);
        return jdbc.query("select a.uid from hotel_auth_sessions s join hotel_auth_accounts a on a.uid = s.uid "
                        + "where s.token_hash = ? and s.expires_at > now() and a.enabled = true",
                rs -> rs.next() ? Optional.of(rs.getString(1)) : Optional.empty(), hash);
    }

    public String createSession(String uid) {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        jdbc.update("insert into hotel_auth_sessions(token_hash, uid, expires_at) values (?, ?, ?)",
                hash(token), uid, OffsetDateTime.ofInstant(Instant.now().plus(SESSION_LIFETIME), ZoneOffset.UTC));
        return token;
    }

    public void revokeSession(String token) {
        jdbc.update("delete from hotel_auth_sessions where token_hash = ?", hash(token));
    }

    public void updatePassword(String uid, String passwordHash) {
        int updated = jdbc.update("update hotel_auth_accounts set password_hash = ? where uid = ? and enabled = true",
                passwordHash, uid);
        if (updated == 0) throw new IllegalStateException("Account not found or disabled");
        jdbc.update("delete from hotel_auth_sessions where uid = ?", uid);
    }

    private String hash(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash session token", exception);
        }
    }
}
