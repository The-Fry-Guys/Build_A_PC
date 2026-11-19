package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.inOrder
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.post
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

/** Tests Google login validation, security access, and public responses. */
@WebMvcTest(GoogleAuthController::class)
@Import(SecurityConfig::class, ApiExceptionHandler::class)
class GoogleAuthControllerTests @Autowired constructor(
    private val mvc: MockMvc,
) {
    @MockitoBean
    private lateinit var google: GoogleIdentityClient

    @MockitoBean
    private lateinit var identityVerifier: GoogleIdentityVerifier

    @MockitoBean
    private lateinit var accounts: AccountService

    @MockitoBean
    private lateinit var tokens: AppTokenService

    @MockitoBean
    private lateinit var jwtDecoder: JwtDecoder

    // SecurityConfig needs this for database-backed admin authorization.
    @MockitoBean
    private lateinit var users: UserRepository

    private val path = "/api/v1/auth/google"
    private val code = "test-code"
    private val verifier = "a".repeat(43)
    private val callback = "http://localhost:8081/auth"

    private val identity = ProviderIdentity(
        provider = AuthProvider.GOOGLE,
        providerUserId = "google-user-123",
        email = "member@example.com",
        emailVerified = true,
        displayName = "Test Member",
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
        requestCallback: String = callback,
    ) = """
        {
          "code": "$requestCode",
          "code_verifier": "$requestVerifier",
          "redirect_uri": "$requestCallback"
        }
    """.trimIndent()

    private fun postLogin(body: String = request()) =
        mvc.post(path) {
            contentType = MediaType.APPLICATION_JSON
            content = body
        }

    private fun stubGoogle() {
        `when`(google.exchange(code, verifier, callback))
            .thenReturn(identity)
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
    fun `anonymous login returns app token and approved user fields`() {
        stubGoogle()
        `when`(accounts.findOrCreate(identity)).thenReturn(user)
        `when`(tokens.issueFor(user)).thenReturn("test-app-jwt")

        // No Authorization header: obtaining the first token must be public.
        postLogin().andExpect {
            status { isOk() }
            content { contentTypeCompatibleWith("application/json") }
            header {
                string("Cache-Control", "no-store")
                string("Pragma", "no-cache")
            }
            jsonPath("$.length()") { value(2) }
            jsonPath("$.token") { value("test-app-jwt") }
            jsonPath("$.user.length()") { value(5) }
            jsonPath("$.user.id") { value(user.id.toString()) }
            jsonPath("$.user.email") { value(user.email) }
            jsonPath("$.user.display_name") { value("Test Member") }
            jsonPath("$.user.role") { value("USER") }
            jsonPath("$.user.created_at") {
                value("2026-01-01T00:00:00Z")
            }
        }

        val order = inOrder(google, accounts, tokens)
        order.verify(google).exchange(code, verifier, callback)
        order.verify(accounts).findOrCreate(identity)
        order.verify(tokens).issueFor(user)
        order.verifyNoMoreInteractions()
    }

    @ParameterizedTest
    @ValueSource(strings = ["code", "verifier", "callback"])
    fun `invalid input is rejected before services run`(invalid: String) {
        val body = request(
            requestCode = if (invalid == "code") "" else code,
            requestVerifier = if (invalid == "verifier") "short" else verifier,
            requestCallback = if (invalid == "callback") "" else callback,
        )

        postLogin(body).andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(400) }
            jsonPath("$.instance") { value(path) }
        }

        verifyNoInteractions(google, identityVerifier, accounts, tokens)
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "{}",
            "{broken-json",
            """{"idToken":" "}""",
            """{"code":"incomplete"}""",
            """{"idToken":"token","code":"mixed"}""",
            """{"idToken":"token","redirect_uri":"mixed"}""",
        ],
    )
    fun `missing fields and malformed requests are rejected`(body: String) {
        postLogin(body).andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
        }

        verifyNoInteractions(google, identityVerifier, accounts, tokens)
    }

    @Test
    fun `unverified email prevents account creation`() {
        `when`(google.exchange(code, verifier, callback))
            .thenThrow(EmailNotVerifiedException())

        assertProblem(400, "Verify your email at the provider before signing in.")

        verifyNoInteractions(accounts, tokens)
    }

    @Test
    fun `GitHub email conflict prevents token issuance`() {
        stubGoogle()
        `when`(accounts.findOrCreate(identity))
            .thenThrow(ProviderConflictException(AuthProvider.GITHUB))

        assertProblem(
            409,
            "This email is already registered with GitHub. Sign in with that provider.",
        )

        verifyNoInteractions(tokens)
    }

    @Test
    fun `provider failure prevents account creation`() {
        val detail = "Google sign-in could not be completed. Try again later."
        `when`(google.exchange(code, verifier, callback))
            .thenThrow(ResponseStatusException(HttpStatus.BAD_GATEWAY, detail))

        assertProblem(502, detail)

        verifyNoInteractions(accounts, tokens)
    }

    @Test
    fun `missing Google configuration returns service unavailable`() {
        val detail = "Google sign-in is not configured."
        `when`(google.exchange(code, verifier, callback))
            .thenThrow(
                ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, detail),
            )

        assertProblem(503, detail)

        verifyNoInteractions(accounts, tokens)
    }
    @Test
    fun `native ID token is verified before accounts and app tokens`() {
        `when`(identityVerifier.verify("native-id-token")).thenReturn(identity)
        `when`(accounts.findOrCreate(identity)).thenReturn(user)
        `when`(tokens.issueFor(user)).thenReturn("native-app-jwt")
        postLogin("""{"idToken":"native-id-token"}""").andExpect {
            status { isOk() }
            header { string("Cache-Control", "no-store"); string("Pragma", "no-cache") }
            jsonPath("$.token") { value("native-app-jwt") }
            jsonPath("$.user.id") { value(user.id.toString()) }
            jsonPath("$.user.email") { value(user.email) }
            jsonPath("$.idToken") { doesNotExist() }
        }
        val order = inOrder(identityVerifier, accounts, tokens)
        order.verify(identityVerifier).verify("native-id-token")
        order.verify(accounts).findOrCreate(identity)
        order.verify(tokens).issueFor(user)
        verifyNoInteractions(google)
    }

    @ParameterizedTest
    @ValueSource(ints = [400, 502, 503])
    fun `native verification failures never persist accounts`(status: Int) {
        `when`(identityVerifier.verify("invalid-token"))
            .thenThrow(ResponseStatusException(HttpStatus.valueOf(status), "Google sign-in failed."))
        postLogin("""{"idToken":"invalid-token"}""").andExpect {
            status { isEqualTo(status) }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.detail") { value("Google sign-in failed.") }
            jsonPath("$.token") { doesNotExist() }
        }
        verifyNoInteractions(google, accounts, tokens)
    }

    @Test
    fun `native unverified email never persists an account`() {
        `when`(identityVerifier.verify("unverified" )).thenThrow(EmailNotVerifiedException())
        postLogin("""{"idToken":"unverified"}""").andExpect { status { isBadRequest() } }
        verifyNoInteractions(google, accounts, tokens)
    }

    @Test
    fun `native GitHub email conflict does not issue an app token`() {
        `when`(identityVerifier.verify("native-id-token")).thenReturn(identity)
        `when`(accounts.findOrCreate(identity)).thenThrow(ProviderConflictException(AuthProvider.GITHUB))
        postLogin("""{"idToken":"native-id-token"}""").andExpect {
            status { isConflict() }
            jsonPath("$.detail") { value("This email is already registered with GitHub. Sign in with that provider.") }
        }
        verifyNoInteractions(google, tokens)
    }

}
