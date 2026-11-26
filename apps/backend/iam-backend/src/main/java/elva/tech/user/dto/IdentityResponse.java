package elva.tech.user.dto;
import java.time.Instant;
import java.util.UUID;

import elva.tech.user.entity.UserEntity;
public record IdentityResponse(
    UUID id,
    String email,
    String displayName,
    String status,
    Instant emailVerifiedAt,
    Instant lastLoginAt,
    Instant createdAt,
    Instant updatedAt
) {
    public static IdentityResponse fromEntity(UserEntity user) {
        return new IdentityResponse(
            user.getId(),
            user.getEmail(),
            user.getDisplayName(),
            user.getStatus(),
            user.getEmailVerifiedAt(),
            user.getLastLoginAt(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }
}