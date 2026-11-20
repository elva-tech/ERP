package com.elva.platformadminbackend.module;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/modules")
public class ModuleController {

    private final ModuleRepository repository;

    public ModuleController(ModuleRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Module> getAllModules() {
        return repository.findAll();
    }

    // Create a new module
    @PostMapping
    public ResponseEntity<?> createModule(@RequestBody Module module) {
        if (repository.existsById(module.getCode())) {
            return ResponseEntity.badRequest().body("Module code already exists.");
        }
        return ResponseEntity.ok(repository.save(module));
    }

    // Delete a module
    @DeleteMapping("/{code}")
    public ResponseEntity<?> deleteModule(@PathVariable String code) {
        if (!repository.existsById(code)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(code);
        return ResponseEntity.ok().build();
    }
}