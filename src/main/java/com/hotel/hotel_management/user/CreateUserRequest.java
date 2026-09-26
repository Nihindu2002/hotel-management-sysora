package com.hotel.hotel_management.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * An administrator provisioning a staff account.
 *
 * The role is explicit and must be a staff role — there is no customer role to
 * default to, and no way to create one through this path.
 */
public record CreateUserRequest(

        @NotBlank
        @Email
        String email,

        @NotBlank
        @Size(min = 8)
        @Pattern(
                regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).+$",
                message = "Password must contain uppercase, lowercase, number, and special character")
        String password,

        @NotBlank
        String firstName,

        String lastName,

        String phone,

        @NotNull
        Role role
) {
}
