package elva.tech.user.dto;
import java.util.List;

import org.springframework.data.domain.Page;

import elva.tech.user.entity.UserEntity;
public record IdentityListResponse(
    List<IdentityResponse> content,
    PaginationResponse pagination
) {
    public static IdentityListResponse fromPage(Page<UserEntity> page) {
        return new IdentityListResponse(
            page.getContent().stream()
                .map(IdentityResponse::fromEntity)
                .toList(),
            PaginationResponse.fromPage(page)
        );
    }
}