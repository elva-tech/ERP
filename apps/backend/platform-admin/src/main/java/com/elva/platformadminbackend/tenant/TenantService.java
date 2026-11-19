package com.elva.platformadminbackend.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface TenantService {
    TenantResponse createTenant(CreateTenantRequest request);
    Page<TenantResponse> getAllTenants(Pageable pageable);
    TenantResponse getTenantById(UUID id);
    TenantResponse updateStatus(UUID id, TenantStatus newStatus);
    TenantResponse updateModules(UUID id, List<String> modules);
}