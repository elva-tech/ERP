package elva.tech.user.exception;
import elva.tech.user.dto.ErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ErrorResponse.of(ex.getMessage(), "IDENTITY_EMAIL_ALREADY_EXISTS"));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(error -> error.getDefaultMessage())
                .orElse("Invalid request");
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(message, "VALIDATION_ERROR"));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> handleInvalidJson(HttpMessageNotReadableException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of("Invalid request body", "VALIDATION_ERROR"));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleInvalidArgument(IllegalArgumentException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(ex.getMessage(), "VALIDATION_ERROR"));
    }
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String message = switch (ex.getName()) {
            case "page", "size" -> "Invalid pagination parameters";
            case "emailVerified" -> "Invalid email verification filter";
            default -> "Invalid request parameter: " + ex.getName();
        };
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(message, "VALIDATION_ERROR"));
    }
    @ExceptionHandler(IdentityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleIdentityNotFound(IdentityNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ErrorResponse.of(ex.getMessage(), "IDENTITY_NOT_FOUND"));
    }
    @ExceptionHandler(InvalidIdentityIdException.class)
    public ResponseEntity<ErrorResponse> handleInvalidIdentityId(InvalidIdentityIdException ex) {
        return ResponseEntity.badRequest()
                .body(ErrorResponse.of(ex.getMessage(), "INVALID_ID_FORMAT"));
    }
}