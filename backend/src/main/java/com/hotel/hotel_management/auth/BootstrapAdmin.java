package com.hotel.hotel_management.auth;

import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/** Creates the first local admin account when explicitly configured. */
@Component
public class BootstrapAdmin implements ApplicationRunner {
    private final String email;
    private final String password;
    private final UserRepository users;
    private final AuthRepository accounts;
    private final PasswordEncoder encoder;

    public BootstrapAdmin(@Value("${hotel.bootstrap-admin.email:}") String email,
            @Value("${hotel.bootstrap-admin.password:}") String password,
            UserRepository users, AuthRepository accounts, PasswordEncoder encoder) {
        this.email = email == null ? "" : email.trim();
        this.password = password == null ? "" : password;
        this.users = users;
        this.accounts = accounts;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank() || password.isBlank() || accounts.hasAccounts()) return;
        User profile = users.findByEmail(email).orElseGet(() -> {
            String uid = UUID.randomUUID().toString();
            return users.createProfile(uid, email, "Hotel", "Administrator", null, Role.ADMIN);
        });
        if (!Role.ADMIN.name().equalsIgnoreCase(profile.getRole())) {
            users.updateRole(profile.getUid(), Role.ADMIN);
        }
        users.enableUser(profile.getUid());
        accounts.createOrResetAccount(profile.getUid(), email, encoder.encode(password));
    }
}
