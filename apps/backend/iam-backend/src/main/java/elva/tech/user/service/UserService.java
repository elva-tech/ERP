package elva.tech.user.service;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import elva.tech.user.dto.CreateIdentityRequest;
import elva.tech.user.dto.IdentityListResponse;
import elva.tech.user.dto.IdentityResponse;
import elva.tech.user.entity.UserEntity;
import elva.tech.user.exception.DuplicateEmailException;
import elva.tech.user.exception.IdentityNotFoundException;
import elva.tech.user.exception.InvalidIdentityIdException;
import elva.tech.user.repository.UserRepository;
import jakarta.persistence.criteria.Predicate;
@Service
public class UserService {
    private final UserRepository userRepository;
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
        "id", "email", "displayName", "status",
        "emailVerifiedAt", "lastLoginAt", "createdAt", "updatedAt"
    );
    private static final Set<String> ALLOWED_STATUSES = Set.of(
        "PENDING_ACTIVATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"
    );
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    @Transactional
    public IdentityResponse createIdentity(CreateIdentityRequest request) {
        String email = request.email().trim();
        String normalizedEmail = email.toLowerCase(Locale.ROOT);
        if (userRepository.existsByNormalizedEmail(normalizedEmail)) {
            throw new DuplicateEmailException();
        }
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setNormalizedEmail(normalizedEmail);
        user.setDisplayName(request.displayName().trim());
        user.setStatus("PENDING_ACTIVATION");
        user.setEmailVerifiedAt(null);
        user.setLastLoginAt(null);
        try {
            UserEntity savedUser = userRepository.saveAndFlush(user);
            return IdentityResponse.fromEntity(savedUser);
        } catch (DataIntegrityViolationException ex) {
            Throwable cause = ex.getMostSpecificCause();
            if (cause instanceof SQLException sqlException
                    && "23505".equals(sqlException.getSQLState())
                    && cause.getMessage() != null
                    && cause.getMessage().contains("normalized_email")) {
                throw new DuplicateEmailException();
            }
            throw ex;
        }
    }
    @Transactional(readOnly = true)
    public IdentityListResponse getAllIdentities(
            int page,
            int size,
            String sortBy,
            String sortDirection,
            String status,
            Boolean emailVerified,
            String search) {
        if (page < 0 || size < 1 || size > 100) {
            throw new IllegalArgumentException("Invalid pagination parameters");
        }
        if (!ALLOWED_SORT_FIELDS.contains(sortBy)) {
            throw new IllegalArgumentException("Invalid sorting field");
        }
        if (!"ASC".equalsIgnoreCase(sortDirection)
                && !"DESC".equalsIgnoreCase(sortDirection)) {
            throw new IllegalArgumentException("Invalid sorting direction");
        }
        if (status != null && !ALLOWED_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Invalid identity status");
        }
        Sort.Direction direction = Sort.Direction.fromString(sortDirection);
        Pageable pageable = PageRequest.of(
            page,
            size,
            Sort.by(direction, sortBy).and(Sort.by("id"))
        );
        Specification<UserEntity> specification = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (emailVerified != null) {
                if (emailVerified) {
                    predicates.add(cb.isNotNull(root.get("emailVerifiedAt")));
                } else {
                    predicates.add(cb.isNull(root.get("emailVerifiedAt")));
                }
            }
            if (search != null && !search.isBlank()) {
                String keyword = search.trim().toLowerCase(Locale.ROOT)
                    .replace("\\", "\\\\")
                    .replace("%", "\\%")
                    .replace("_", "\\_");
                String pattern = "%" + keyword + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.<String>get("displayName")), pattern, '\\'),
                    cb.like(root.<String>get("normalizedEmail"), pattern, '\\')
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        Page<UserEntity> identities = userRepository.findAll(specification, pageable);
        return IdentityListResponse.fromPage(identities);
    }
    @Transactional(readOnly = true)
    public IdentityResponse getIdentityById(String id) {
        UUID identityId;
        try {
            identityId = UUID.fromString(id);
            if (!identityId.toString().equalsIgnoreCase(id)) {
                throw new InvalidIdentityIdException();
            }
        } catch (IllegalArgumentException ex) {
            throw new InvalidIdentityIdException();
        }
        UserEntity user = userRepository.findById(identityId)
                .orElseThrow(IdentityNotFoundException::new);
        return IdentityResponse.fromEntity(user);
    }
}