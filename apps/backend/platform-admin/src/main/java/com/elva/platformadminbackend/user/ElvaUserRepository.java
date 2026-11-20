package com.elva.platformadminbackend.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface ElvaUserRepository extends JpaRepository<ElvaUser, UUID> {
    boolean existsByWorkEmail(String workEmail);
}