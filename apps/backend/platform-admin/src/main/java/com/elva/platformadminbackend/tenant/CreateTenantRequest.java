package com.elva.platformadminbackend.tenant;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

public record CreateTenantRequest(
    @NotBlank(message = "Company name is required") String name,
    @NotBlank(message = "Tenant code is required") String code,
    String legalEntity,
    String country,
    String timezone,
    String currency,
    @NotBlank(message = "Admin email is required") @Email(message = "Invalid email format") String adminEmail,
    List<String> modules
) {}