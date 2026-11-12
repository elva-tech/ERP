package com.elva.platformadminbackend.tenant;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenants")
public class TenantController {

    private final TenantService tenantService;

    public TenantController(TenantService tenantService) {
        this.tenantService = tenantService;
    }

    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody CreateTenantRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(tenantService.createTenant(request));
    }

    @GetMapping
    public ResponseEntity<Page<TenantResponse>> getAllTenants(
        @PageableDefault(size = 20, sort = "createdAt") Pageable pageable
    ) {
        return ResponseEntity.ok(tenantService.getAllTenants(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TenantResponse> getTenantById(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.getTenantById(id));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<TenantResponse> updateTenantStatus(
        @PathVariable UUID id, @RequestBody Map<String, String> body
    ) {
        TenantStatus newStatus;
        try {
            newStatus = TenantStatus.valueOf(body.get("status").toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Invalid status provided. Allowed values: PROVISIONING, ACTIVE, SUSPENDED, DEACTIVATED");
        }
        return ResponseEntity.ok(tenantService.updateStatus(id, newStatus));
    }
}