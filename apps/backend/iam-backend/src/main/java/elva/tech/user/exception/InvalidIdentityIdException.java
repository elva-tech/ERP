package elva.tech.user.exception;
public class InvalidIdentityIdException extends RuntimeException {
    public InvalidIdentityIdException() {
        super("Invalid identity ID format");
    }
}