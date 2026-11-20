package com.elva.platformadminbackend.user;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import java.util.UUID;

@Service
public class ElvaUserServiceImpl implements ElvaUserService {
    
    private final ElvaUserRepository repository;

    public ElvaUserServiceImpl(ElvaUserRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserResponse createUser(CreateUserRequest req) {
        if (repository.existsByWorkEmail(req.workEmail())) {
            throw new RuntimeException("User with this email already exists.");
        }
        
        ElvaUser user = new ElvaUser();
        user.setFullName(req.fullName());
        user.setWorkEmail(req.workEmail());
        user.setMobileNumber(req.mobileNumber());
        user.setPlatformRole(req.platformRole());
        user.setStatus(UserStatus.INVITATION_PENDING);
        user.setCreatedBy("ELVA Admin");

        ElvaUser saved = repository.save(user);
        return mapToResponse(saved);
    }

    @Override
    public Page<UserResponse> getAllUsers(Pageable pageable) {
        return repository.findAll(pageable).map(this::mapToResponse);
    }

    @Override
    public UserResponse getUserById(UUID id) {
        ElvaUser user = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return mapToResponse(user);
    }

    @Override
    public void deleteUser(UUID id) {
        if (!repository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        repository.deleteById(id);
    }

    @Override
    public UserResponse updateUser(UUID id, CreateUserRequest req) {
        ElvaUser user = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        
        if (!user.getWorkEmail().equals(req.workEmail()) && repository.existsByWorkEmail(req.workEmail())) {
            throw new RuntimeException("This email is already in use by another user.");
        }
        user.setWorkEmail(req.workEmail());
        
        user.setFullName(req.fullName());
        user.setMobileNumber(req.mobileNumber());
        user.setPlatformRole(req.platformRole());
        
        return mapToResponse(repository.save(user));
    }

    private UserResponse mapToResponse(ElvaUser u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getWorkEmail(), 
            u.getMobileNumber(), u.getPlatformRole(), u.getStatus(), u.getCreatedAt(), u.getCreatedBy());
    }
}