package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.mock
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

/** Tests login orchestration, validation, and public HTTP responses. */
class GitHubAuthControllerTests {
    private val github = mock(GitHubIdentityClient::class.java)
    private val accounts = mock(AccountService::class.java)
    private val tokens = mock(AppTokenService::class.java)

    private val mvc = MockMvcBuilders
        .standaloneSetup(GitHubAuthController(github, accounts, tokens))
        .setControllerAdvice(ApiExceptionHandler())
        .build()

    private val path = "/api/v1/auth/github"
    private val code = "fake-code"
    private val verifier = "a".repeat(43)
    private val redirectUri = "http://localhost:8081/auth"

    private val identity = ProviderIdentity(
        provider = AuthProvider.GITHUB,
        providerUserId = "12345",
        email = "user@example.com",
        emailVerified = true,
        displayName = "Test User",
    )

    private val user = User(
        email = identity.email,
        displayName = identity.displayName,
        id = UUID.randomUUID(),
        createdAt = Instant.parse("2026-01-01T00:00:00Z"),
    )

    private fun request(
        requestCode: String = code,
        requestVerifier: String = verifier,
        requestRedirect: String = redirectUri,
    ) = """
        {
          "code": "$requestCode",
          "codeVerifier": "$requestVerifier",
          "redirectUri": "$requestRedirect"
        }
    """.trimIndent()

    private fun postLogin(body: String = request()) =
        mvc.post(path) {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    private fun stubGitHub() {
        `when`(github.exchange(code, verifier, redirectUri)).thenReturn(identity)
    }

    private fun assertProblem(statusCode: Int, detail: String) {
        postLogin().andExpect {
            status { isEqualTo(statusCode) }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(statusCode) }
            jsonPath("$.detail") { value(detail) }
            jsonPath("$.instance") { value(path) }
            jsonPath("$.token") { doesNotExist() }
        }
    }

    @Test
    fun `successful login returns app token and public user fields`() {
        stubGitHub()
        `when`(accounts.findOrCreate(identity)).thenReturn(user)
        `when`(tokens.issueFor(user)).thenReturn("fake-app-jwt")

        postLogin().andExpect {
            status { isOk() }
            content { contentTypeCompatibleWith("application/json") }
            header {
                string("Cache-Control", "no-store")
                string("Pragma", "no-cache")
            }
            jsonPath("$.length()") { value(2) }
            jsonPath("$.token") { value("fake-app-jwt") }
            jsonPath("$.user.length()") { value(5) }
            jsonPath("$.user.id") { value(user.id.toString()) }
            jsonPath("$.user.email") { value(user.email) }
            jsonPath("$.user.display_name") { value("Test User") }
            jsonPath("$.user.role") { value("USER") }
            jsonPath("$.user.created_at") { value("2026-01-01T00:00:00Z") }
        }

        val order = inOrder(github, accounts, tokens)
        order.verify(github).exchange(code, verifier, redirectUri)
        order.verify(accounts).findOrCreate(identity)
        order.verify(tokens).issueFor(user)
        order.verifyNoMoreInteractions()
    }

    @ParameterizedTest
    @ValueSource(strings = ["code", "verifier", "redirect"])
    fun `invalid input is rejected before services run`(invalid: String) {
        val body = request(
            requestCode = if (invalid == "code") "" else code,
            requestVerifier = if (invalid == "verifier") "short" else verifier,
            requestRedirect = if (invalid == "redirect") "" else redirectUri,
        )

        postLogin(body).andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(400) }
            jsonPath("$.instance") { value(path) }
        }

        verifyNoInteractions(github, accounts, tokens)
    }

    @ParameterizedTest
    @ValueSource(strings = ["{}", "{broken-json"])
    fun `missing fields or malformed JSON are rejected`(body: String) {
        postLogin(body).andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
        }

        verifyNoInteractions(github, accounts, tokens)
    }

    @Test
    fun `unverified GitHub email prevents account creation`() {
        `when`(github.exchange(code, verifier, redirectUri))
            .thenThrow(EmailNotVerifiedException())

        assertProblem(400, "Verify your email at the provider before signing in.")

        verifyNoInteractions(accounts, tokens)
    }

    @Test
    fun `account conflict prevents token issuance`() {
        stubGitHub()
        `when`(accounts.findOrCreate(identity))
            .thenThrow(ProviderConflictException(AuthProvider.GOOGLE))

        assertProblem(
            409,
            "This email is already registered with Google. Sign in with that provider.",
        )

        verifyNoInteractions(tokens)
    }

    @Test
    fun `provider failure returns bad gateway without creating an account`() {
        `when`(github.exchange(code, verifier, redirectUri))
            .thenThrow(
                ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "GitHub sign-in could not be completed. Try again later.",
                ),
            )

        assertProblem(502, "GitHub sign-in could not be completed. Try again later.")

        verifyNoInteractions(accounts, tokens)
    }
}
