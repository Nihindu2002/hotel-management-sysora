package com.hotel.hotel_management.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
import com.hotel.hotel_management.user.Role;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class FirebaseAuthenticationFilter extends OncePerRequestFilter {

    private final FirebaseAuth firebaseAuth;
    private final UserRepository userRepository;

    public FirebaseAuthenticationFilter(FirebaseAuth firebaseAuth, UserRepository userRepository) {
        this.firebaseAuth = firebaseAuth;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        String authorization = request.getHeader("Authorization");
        if (authorization == null || !authorization.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty()) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            FirebaseToken verifiedToken = firebaseAuth.verifyIdToken(token);
            User profile = userRepository.findByUid(verifiedToken.getUid()).orElse(null);

            if (profile == null || !profile.isEnabled() || profile.getRole() == null) {
                SecurityContextHolder.clearContext();
            } else {
                Role role = Role.valueOf(profile.getRole().toUpperCase(java.util.Locale.ROOT));
                List<SimpleGrantedAuthority> authorities = List.of(
                        new SimpleGrantedAuthority("ROLE_" + role.name()));
                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(verifiedToken, null, authorities);
                authentication.setDetails(profile);
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }
        } catch (Exception exception) {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
