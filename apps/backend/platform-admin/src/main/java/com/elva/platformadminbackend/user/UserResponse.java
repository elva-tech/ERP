package com.elva.platformadminbackend.user;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserResponse(
    UUID id, String fullName, String workEmail, String mobileNumber,
    PlatformRole platformRole, UserStatus status, LocalDateTime createdAt, String createdBy
) {}