package com.elva.platformadminbackend.user;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateUserRequest(
    @NotBlank(message = "Full name is required") String fullName,
    @NotBlank(message = "Work email is required") @Email String workEmail,
    String mobileNumber,
    @NotNull(message = "Platform role is required") PlatformRole platformRole
) {}