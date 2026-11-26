package elva.tech.user.dto;
import java.time.Instant;
public record ErrorResponse(
    boolean success,
    String message,
    String errorCode,
    Instant timestamp
) {
    public static ErrorResponse of(String message, String errorCode) {
        return new ErrorResponse(false, message, errorCode, Instant.now());
    }
}