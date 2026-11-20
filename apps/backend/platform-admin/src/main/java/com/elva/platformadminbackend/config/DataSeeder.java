package com.elva.platformadminbackend.config;

import com.elva.platformadminbackend.module.Module;
import com.elva.platformadminbackend.module.ModuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(ModuleRepository repository) {
        return args -> {
            // Check if the table is empty before inserting, so we don't duplicate on every restart
            if (repository.count() == 0) {
                repository.save(new Module("HR_CORE", "HR Core", "Human Resources core module", true));
                repository.save(new Module("FINANCE", "Finance", "Accounting and Finance module", true));
                repository.save(new Module("PROCUREMENT", "Procurement", "Purchasing and procurement module", true));
                
                System.out.println("✅ Successfully seeded default modules into the database!");
            }
        };
    }
}