package com.elva.platformadminbackend.tenant;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List; // <--- MAKE SURE THIS IS HERE
import java.util.UUID;

@Data
@Entity
@Table(name = "tenants")
public class Tenant {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String code;

    private String legalEntity;
    private String country;
    private String timezone;
    private String currency;
    private String adminEmail;
    
    @Column(nullable = false)
    private String status;

    private LocalDateTime createdAt = LocalDateTime.now();

    // --- THIS IS THE CRUCIAL PART ---
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "tenant_modules", joinColumns = @JoinColumn(name = "tenant_id"))
    @Column(name = "module_name")
    private List<String> modules;
}