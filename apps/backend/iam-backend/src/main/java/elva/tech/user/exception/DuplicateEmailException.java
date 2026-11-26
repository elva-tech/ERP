package elva.tech.user.exception;
public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException() {
        super("An identity with this email already exists");
    }
}