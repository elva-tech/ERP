package elva.tech.user;
import java.time.Instant;
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
class IdentityListTests {
    @Autowired
    private WebApplicationContext context;
    @Autowired
    private UserRepository userRepository;
    private MockMvc mockMvc;
    private String keyword;
    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context)
                .apply(springSecurity())
                .build();
        keyword = "iamtest-" + UUID.randomUUID();
        createUser(keyword + "-a@example.com", "Alpha " + keyword, "ACTIVE", true);
        createUser(keyword + "-b@example.com", "Beta " + keyword, "PENDING_ACTIVATION", false);
    }
    private void createUser(String email, String name, String status, boolean verified) {
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setNormalizedEmail(email.toLowerCase(java.util.Locale.ROOT));
        user.setDisplayName(name);
        user.setStatus(status);
        user.setEmailVerifiedAt(verified ? Instant.now() : null);
        userRepository.saveAndFlush(user);
    }
    @Test
    void getAllIdentitiesReturnsSuccess() throws Exception {
        mockMvc.perform(get("/api/v1/identities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Identities retrieved successfully"))
                .andExpect(jsonPath("$.data.content").isArray())
                .andExpect(jsonPath("$.data.pagination.page").value(0))
                .andExpect(jsonPath("$.data.pagination.size").value(10));
    }
    @Test
    void paginationWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword)
                .param("page", "0")
                .param("size", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.pagination.totalElements").value(2))
                .andExpect(jsonPath("$.data.pagination.totalPages").value(2))
                .andExpect(jsonPath("$.data.pagination.first").value(true))
                .andExpect(jsonPath("$.data.pagination.last").value(false));
    }
    @Test
    void sortingWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword)
                .param("sortBy", "displayName")
                .param("sortDirection", "ASC"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].displayName").value("Alpha " + keyword))
                .andExpect(jsonPath("$.data.content[1].displayName").value("Beta " + keyword));
    }
    @Test
    void statusFilterWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword)
                .param("status", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("ACTIVE"));
    }
    @Test
    void verifiedEmailFilterWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword)
                .param("emailVerified", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].emailVerifiedAt").isNotEmpty());
    }
    @Test
    void unverifiedEmailFilterWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword)
                .param("emailVerified", "false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING_ACTIVATION"));
    }
    @Test
    void searchWorks() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", keyword.toUpperCase(java.util.Locale.ROOT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2));
    }
    @Test
    void emptySearchReturnsEmptyContent() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("search", UUID.randomUUID().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.pagination.totalElements").value(0))
                .andExpect(jsonPath("$.data.pagination.totalPages").value(0));
    }
    @Test
    void invalidPageReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("page", "-1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    void invalidSizeReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("size", "101"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    void invalidSortFieldReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("sortBy", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    void invalidSortDirectionReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("sortDirection", "invalid"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    void invalidStatusReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("status", "INVALID"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
    @Test
    void invalidEmailVerifiedReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/v1/identities")
                .param("emailVerified", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").value("VALIDATION_ERROR"));
    }
}