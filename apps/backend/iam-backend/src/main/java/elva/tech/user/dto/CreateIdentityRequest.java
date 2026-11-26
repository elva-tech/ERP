package elva.tech.user.dto;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
public record CreateIdentityRequest(
    @NotBlank(message = "Invalid email address")
    @Email(message = "Invalid email address")
    @Size(max = 255, message = "Email must not exceed 255 characters")
    String email,
    @NotBlank(message = "Display name is required")
    @Size(min = 2, max = 150, message = "Display name must be between 2 and 150 characters")
    String displayName
) {
    public CreateIdentityRequest {
        email = email == null ? null : email.trim();
        displayName = displayName == null ? null : displayName.trim();
    }
}