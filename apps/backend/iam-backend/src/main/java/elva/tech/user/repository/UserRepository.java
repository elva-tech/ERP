package elva.tech.user.repository;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import elva.tech.user.entity.UserEntity;
@Repository
public interface UserRepository extends JpaRepository<UserEntity, UUID>,
        JpaSpecificationExecutor<UserEntity> {
    boolean existsByNormalizedEmail(String normalizedEmail);
}