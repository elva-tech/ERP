package elva.tech.user;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

import elva.tech.user.repository.UserRepository;
@SpringBootTest
@Transactional
class UserControllerTests {
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
    @WithMockUser(roles = "ADMIN")
    void invalidEmailReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/identities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "invalid-email",
                        "displayName": "Test User"
                    }
                    """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    @WithMockUser(roles = "ADMIN")
    void missingDisplayNameReturnsBadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/identities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                        "email": "test@example.com"
                    }
                    """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    @WithMockUser(roles = "ADMIN")
    void createIdentityReturnsCreated() throws Exception {
        String email = "iam-test-" + UUID.randomUUID() + "@example.com";
        String body = """
            {
                "email": "%s",
                "displayName": "IAM Test User"
            }
            """.formatted(email);
        mockMvc.perform(post("/api/v1/identities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Identity created successfully"))
                .andExpect(jsonPath("$.data.id").isNotEmpty())
                .andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.displayName").value("IAM Test User"))
                .andExpect(jsonPath("$.data.status").value("PENDING_ACTIVATION"))
                .andExpect(jsonPath("$.data.createdAt").isNotEmpty())
                .andExpect(jsonPath("$.data.updatedAt").isNotEmpty())
                .andExpect(jsonPath("$.data.normalizedEmail").doesNotExist());
        assertTrue(userRepository.existsByNormalizedEmail(email));
    }
    @Test
    @WithMockUser(roles = "ADMIN")
    void duplicateEmailReturnsConflict() throws Exception {
        String email = "iam-duplicate-" + UUID.randomUUID() + "@example.com";
        String body = """
            {
                "email": "%s",
                "displayName": "Duplicate Test User"
            }
            """.formatted(email);
        mockMvc.perform(post("/api/v1/identities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isCreated());
        mockMvc.perform(post("/api/v1/identities")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.errorCode").value("IDENTITY_EMAIL_ALREADY_EXISTS"))
                .andExpect(jsonPath("$.message").value("An identity with this email already exists"));
    }
}