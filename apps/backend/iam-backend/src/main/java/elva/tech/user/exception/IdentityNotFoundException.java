package elva.tech.user.exception;
public class IdentityNotFoundException extends RuntimeException {
    public IdentityNotFoundException() {
        super("Identity not found");
    }
}