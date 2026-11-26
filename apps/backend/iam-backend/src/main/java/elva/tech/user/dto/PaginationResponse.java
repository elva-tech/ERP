package elva.tech.user.dto;
import org.springframework.data.domain.Page;
public record PaginationResponse(
    int page,
    int size,
    long totalElements,
    int totalPages,
    boolean first,
    boolean last
) {
    public static PaginationResponse fromPage(Page<?> page) {
        return new PaginationResponse(
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isFirst(),
            page.isLast()
        );
    }
}