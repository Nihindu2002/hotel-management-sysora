package com.hotel.hotel_management.security;

import com.hotel.hotel_management.auth.AuthRepository;
import com.hotel.hotel_management.user.Role;
import com.hotel.hotel_management.user.User;
import com.hotel.hotel_management.user.UserRepository;
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
public class SessionAuthenticationFilter extends OncePerRequestFilter {
    private final AuthRepository authRepository;
    private final UserRepository userRepository;

    public SessionAuthenticationFilter(AuthRepository authRepository, UserRepository userRepository) {
        this.authRepository = authRepository;
        this.userRepository = userRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            String token = authorization.substring("Bearer ".length()).trim();
            try {
                authRepository.findUidForToken(token)
                        .flatMap(userRepository::findByUid)
                        .filter(User::isEnabled)
                        .ifPresent(profile -> authenticate(profile));
            } catch (RuntimeException ignored) {
                SecurityContextHolder.clearContext();
            }
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(User profile) {
        Role role;
        try {
            role = Role.valueOf(profile.getRole().toUpperCase(java.util.Locale.ROOT));
        } catch (RuntimeException exception) {
            return;
        }
        AuthenticatedUser principal = new AuthenticatedUser(profile.getUid(), profile.getEmail());
        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                principal, null, List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        authentication.setDetails(profile);
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }
}
