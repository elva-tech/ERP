package elva.tech.user.controller;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import elva.tech.user.dto.ApiResponse;
import elva.tech.user.dto.CreateIdentityRequest;
import elva.tech.user.dto.IdentityListResponse;
import elva.tech.user.dto.IdentityResponse;
import elva.tech.user.service.UserService;
import jakarta.validation.Valid;
@RestController
@RequestMapping("/api/v1/identities")
public class UserController {
    private final UserService userService;
    public UserController(UserService userService) {
        this.userService = userService;
    }
    @PostMapping
    public ResponseEntity<ApiResponse<IdentityResponse>> createIdentity(
            @Valid @RequestBody CreateIdentityRequest request) {
        IdentityResponse identity = userService.createIdentity(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Identity created successfully", identity));
    }
    @GetMapping
    public ResponseEntity<ApiResponse<IdentityListResponse>> getAllIdentities(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "10") int size,
            @RequestParam(name = "sortBy", defaultValue = "createdAt") String sortBy,
            @RequestParam(name = "sortDirection", defaultValue = "DESC") String sortDirection,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "emailVerified", required = false) Boolean emailVerified,
            @RequestParam(name = "search", required = false) String search) {
        IdentityListResponse identities = userService.getAllIdentities(
            page,
            size,
            sortBy,
            sortDirection,
            status,
            emailVerified,
            search
        );
        return ResponseEntity.ok(
            ApiResponse.success("Identities retrieved successfully", identities)
        );
    }
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<IdentityResponse>> getIdentityById(
            @PathVariable("id") String id) {
        IdentityResponse identity = userService.getIdentityById(id);
        return ResponseEntity.ok(
            ApiResponse.success("Identity retrieved successfully", identity)
        );
    }
}