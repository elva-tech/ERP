package com.elva.platformadminbackend.tenant;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class TenantServiceImpl implements TenantService {
    
    private final TenantRepository repository;

    public TenantServiceImpl(TenantRepository repository) {
        this.repository = repository;
    }

    @Override
    public TenantResponse createTenant(CreateTenantRequest req) {
        if (repository.existsByCode(req.code())) {
            throw new RuntimeException("Tenant code already exists.");
        }
        
        Tenant tenant = new Tenant();
        tenant.setName(req.name());
        tenant.setCode(req.code());
        tenant.setLegalEntity(req.legalEntity());
        tenant.setCountry(req.country());
        tenant.setTimezone(req.timezone());
        tenant.setCurrency(req.currency());
        tenant.setAdminEmail(req.adminEmail());
        tenant.setModules(req.modules());
        tenant.setStatus(TenantStatus.PROVISIONING);
        tenant.setCreatedAt(LocalDateTime.now());

        return mapToResponse(repository.save(tenant));
    }

    @Override
    public Page<TenantResponse> getAllTenants(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public TenantResponse getTenantById(UUID id) {
        Tenant tenant = repository.findById(id).orElseThrow(() -> new RuntimeException("Tenant not found"));
        return mapToResponse(tenant);
    }

    @Override
    public TenantResponse updateStatus(UUID id, TenantStatus newStatus) {
        Tenant tenant = repository.findById(id).orElseThrow(() -> new RuntimeException("Tenant not found"));
        tenant.setStatus(newStatus);
        return mapToResponse(repository.save(tenant));
    }

    private TenantResponse mapToResponse(Tenant t) {
        return new TenantResponse(t.getId(), t.getName(), t.getCode(), t.getLegalEntity(), 
            t.getCountry(), t.getTimezone(), t.getCurrency(), t.getAdminEmail(), 
            t.getStatus(), t.getCreatedAt(), t.getModules());
    }
}