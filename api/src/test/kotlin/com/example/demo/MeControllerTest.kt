package com.example.demo
import com.fasterxml.jackson.databind.ObjectMapper
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.util.Optional
import java.util.UUID

@WebMvcTest(MeController::class)
@Import(SecurityConfig::class)
class MeControllerTest @Autowired constructor(private val mvc: MockMvc) {
    private val mapper = ObjectMapper()

    @MockitoBean
    private lateinit var jwtDecoder: JwtDecoder

    @MockitoBean
    private lateinit var userRepository: UserRepository

    @MockitoBean
    private lateinit var accountService: AccountService

    @Test
    fun `updateProfile returns updated user data (PRD-8)`() {
        val userId = UUID.randomUUID()
        val mockJwt = Jwt.withTokenValue("mock-token")
            .header("alg", "none")
            .claim("sub", userId.toString())
            .build()

        val originalUser = User(
            email = "test@example.com",
            displayName = "Old Name",
            id = userId
        )

        val updatedUser = User(
            email = "test@example.com",
            displayName = "New Name",
            id = userId
        )

        val updateRequest = ProfileUpdateRequest(displayName = "New Name")
        `when`(userRepository.findById(eq(userId) ?: userId)).thenReturn(Optional.of(originalUser))
        `when`(accountService.updateProfile(eq(userId) ?: userId, any(ProfileUpdateRequest::class.java) ?: updateRequest))
            .thenReturn(updatedUser)

        mvc.perform(
            put("/api/v1/me")
                .with(jwt().jwt(mockJwt))
                .contentType(MediaType.APPLICATION_JSON)
                .content(mapper.writeValueAsString(updateRequest))
        )
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.display_name").value("New Name"))
            .andExpect(jsonPath("$.email").value("test@example.com"))
    }

    @Test
    fun `deleteAccount calls service and returns 204 No Content (PRD-9)`() {
        val userId = UUID.randomUUID()
        val mockJwt = Jwt.withTokenValue("mock-token")
            .header("alg", "none")
            .claim("sub", userId.toString())
            .build()

        val user = User(
            email = "delete-me@example.com",
            id = userId
        )

        `when`(userRepository.findById(eq(userId) ?: userId)).thenReturn(Optional.of(user))

        mvc.perform(
            delete("/api/v1/me")
                .with(jwt().jwt(mockJwt))
        )
            .andExpect(status().isNoContent)

        verify(accountService).deleteAccount(eq(userId) ?: userId)
    }
}