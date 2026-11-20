package com.elva.platformadminbackend.module;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor // <-- Creates the empty constructor
@AllArgsConstructor // <-- Creates the constructor with arguments
@Entity
@Table(name = "modules")
public class Module {
    @Id
    private String code;

    @Column(nullable = false)
    private String name;

    private String description;
    
    private boolean isActive = true;
}