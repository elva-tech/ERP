package com.elva.platformadminbackend.tenant;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public record TenantResponse(
    UUID id, String name, String code, String legalEntity, String country, 
    String timezone, String currency, String adminEmail, TenantStatus status, 
    LocalDateTime createdAt, List<String> modules
) {}