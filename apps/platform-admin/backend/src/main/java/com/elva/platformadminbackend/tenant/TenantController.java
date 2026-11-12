package com.elva.platformadminbackend.tenant;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tenants")
@CrossOrigin(origins = "http://localhost:5173") // THIS IS CRUCIAL FOR REACT TO CONNECT
public class TenantController {

    private final TenantRepository tenantRepository;

    public TenantController(TenantRepository tenantRepository) {
        this.tenantRepository = tenantRepository;
    }

    @PostMapping
    public ResponseEntity<?> createTenant(@RequestBody Tenant tenant) {
        if (tenantRepository.existsByCode(tenant.getCode())) {
            return ResponseEntity.badRequest().body("Tenant code already exists.");
        }
        tenant.setStatus("PROVISIONING");
        return ResponseEntity.ok(tenantRepository.save(tenant));
    }

    @GetMapping
    public List<Tenant> getAllTenants() {
        return tenantRepository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getTenantById(@PathVariable java.util.UUID id) {
        return tenantRepository.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // --- ADD THIS METHOD ---
    @PutMapping("/{id}/status")
    public ResponseEntity<?> updateTenantStatus(@PathVariable java.util.UUID id, @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        
        return tenantRepository.findById(id)
            .map(tenant -> {
                tenant.setStatus(newStatus);
                tenantRepository.save(tenant);
                return ResponseEntity.ok(tenant);
            })
            .orElse(ResponseEntity.notFound().build());
    }
}