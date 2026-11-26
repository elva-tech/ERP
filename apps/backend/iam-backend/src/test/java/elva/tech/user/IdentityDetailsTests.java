package elva.tech.user;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import elva.tech.user.entity.UserEntity;
import elva.tech.user.repository.UserRepository;
@SpringBootTest
@Transactional
@WithMockUser(roles = "ADMIN")
class IdentityDetailsTests {
    @Autowired
    private WebApplicationContext context;
    @Autowired
    private UserRepository userRepository;
    private MockMvc mockMvc;
    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
    }
    @Test
    void existingIdentityReturnsSuccess() throws Exception {
        String email = "iam-details-" + UUID.randomUUID() + "@example.com";
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setNormalizedEmail(email);
        user.setDisplayName("Identity Details Test User");
        user.setStatus("PENDING_ACTIVATION");
        UserEntity savedUser = userRepository.saveAndFlush(user);
        mockMvc.perform(get("/api/v1/identities/{id}", savedUser.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Identity retrieved successfully"))
                .andExpect(jsonPath("$.data.id").value(savedUser.getId().toString()))
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.displayName").value("Identity Details Test User"))
                .andExpect(jsonPath("$.data.status").value("PENDING_ACTIVATION"))
                .andExpect(jsonPath("$.data.emailVerifiedAt").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.lastLoginAt").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.normalizedEmail").doesNotHaveJsonPath())
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
    @Test
    void nonExistingIdentityReturnsNotFound() throws Exception {
        UUID unknownId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/identities/{id}", unknownId))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Identity not found"))
                .andExpect(jsonPath("$.errorCode").value("IDENTITY_NOT_FOUND"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
    @Test
    void invalidUuidReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities/{id}", "invalid-uuid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid identity ID format"))
                .andExpect(jsonPath("$.errorCode").value("INVALID_ID_FORMAT"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
    }
    @Test
    void shortenedUuidReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities/{id}", "1-1-1-1-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("INVALID_ID_FORMAT"));
    }
}