package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import java.time.Instant
import java.util.Base64
import java.util.Optional
import java.util.UUID

/** Exercises real JWT authentication through the HTTP security filter. */
@WebMvcTest(
    controllers = [
        MeController::class,
        HelloController::class,
        CatalogPartController::class,
    ],
    properties = [
        "app.jwt.issuer=https://buildapc.test",
        "app.jwt.secret-base64=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
        "app.jwt.ttl=PT1H",
    ],
)
@Import(
    SecurityConfig::class,
    AppJwtConfiguration::class,
    AppTokenService::class,
    ApiExceptionHandler::class,
)
class JwtSecurityTests {
    @Autowired
    private lateinit var mvc: MockMvc

    @Autowired
    private lateinit var tokens: AppTokenService

    @Autowired
    private lateinit var encoder: JwtEncoder

    @MockitoBean
    private lateinit var users: UserRepository

    @MockitoBean
    private lateinit var catalog: CatalogPartRepository

    @MockitoBean
    private lateinit var jdbc: JdbcTemplate

    private val userId = UUID.randomUUID()

    private val user = User(
        email = "user@example.com",
        displayName = "Test User",
        id = userId,
        createdAt = Instant.parse("2026-01-01T00:00:00Z"),
    )

    @Test
    fun `me without a token returns unauthorized`() {
        mvc.get("/api/v1/me").andExpect {
            status { isUnauthorized() }
            header { string("WWW-Authenticate", "Bearer") }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(401) }
            jsonPath("$.instance") { value("/api/v1/me") }
        }

        verifyNoInteractions(users)
    }

    @Test
    fun `valid app token returns the current database profile`() {
        `when`(users.findById(userId)).thenReturn(Optional.of(user))

        mvc.get("/api/v1/me") {
            header("Authorization", "Bearer ${tokens.issueFor(user)}")
        }.andExpect {
            status { isOk() }
            header { string("Cache-Control", "no-store") }
            content { contentTypeCompatibleWith("application/json") }
            jsonPath("$.id") { value(userId.toString()) }
            jsonPath("$.email") { value(user.email) }
            jsonPath("$.display_name") { value("Test User") }
            jsonPath("$.role") { value("USER") }
            jsonPath("$.created_at") { value("2026-01-01T00:00:00Z") }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = ["malformed", "expired", "wrong-key", "wrong-issuer"])
    fun `invalid tokens are rejected before database access`(kind: String) {
        val token = when (kind) {
            "malformed" -> "not-a-jwt"
            "expired" -> signedToken(expiresAt = Instant.now().minusSeconds(120))
            "wrong-issuer" -> signedToken(issuer = "https://another-api.test")
            else -> {
                val configuration = AppJwtConfiguration()
                val otherKey = configuration.appJwtKey(
                    AppJwtProperties(
                        issuer = "https://buildapc.test",
                        secretBase64 = Base64.getEncoder().encodeToString(
                            ByteArray(32) { 42.toByte() },
                        ),
                    ),
                )
                signedToken(signingEncoder = configuration.appJwtEncoder(otherKey))
            }
        }

        mvc.get("/api/v1/me") {
            header("Authorization", "Bearer $token")
        }.andExpect {
            status { isUnauthorized() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(401) }
            jsonPath("$.instance") { value("/api/v1/me") }
        }

        verifyNoInteractions(users)
    }

    @Test
    fun `valid token for a missing account returns unauthorized`() {
        `when`(users.findById(userId)).thenReturn(Optional.empty())

        mvc.get("/api/v1/me") {
            header("Authorization", "Bearer ${tokens.issueFor(user)}")
        }.andExpect {
            status { isUnauthorized() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.detail") {
                value("The signed-in account is unavailable. Sign in again.")
            }
        }
    }

    @Test
    fun `regular user is forbidden from admin routes`() {
        `when`(users.findById(userId)).thenReturn(Optional.of(user))
        mvc.get("/api/v1/admin/users") {
            header("Authorization", "Bearer ${tokens.issueFor(user)}")
        }.andExpect {
            status { isForbidden() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.status") { value(403) }
        }

    }

    @Test
    fun `admin role passes authorization for the admin namespace`() {
        `when`(users.findById(userId)).thenReturn(Optional.of(User(email = "admin@example.test", role = UserRole.ADMIN, id = userId)))
        mvc.get("/api/v1/admin/users") {
            header("Authorization", "Bearer ${signedToken(role = "ADMIN")}")
        }.andExpect {
            // Authorization succeeds; this MVC slice intentionally excludes the admin controller.
            status { isNotFound() }
        }
    }

    /** Public catalog reads remain accessible without an app token. */
    @Test
    fun `catalog remains public`() {
        `when`(catalog.findAll(any(Pageable::class.java)))
            .thenReturn(Page.empty<CatalogPart>())

        mvc.get("/api/v1/parts").andExpect { status { isOk() } }
    }

    private fun signedToken(
        issuer: String = "https://buildapc.test",
        expiresAt: Instant = Instant.now().plusSeconds(3600),
        signingEncoder: JwtEncoder = encoder,
        role: String = "USER",
    ): String {
        val claims = JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(userId.toString())
            .issuedAt(expiresAt.minusSeconds(3600))
            .expiresAt(expiresAt)
            .claim("roles", listOf(role))
            .build()

        return signingEncoder.encode(
            JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims,
            ),
        ).tokenValue
    }
}
