package com.example.demo

import io.restassured.RestAssured.given
import io.restassured.http.ContentType
import io.restassured.specification.RequestSpecification
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.anyString
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoBean
import tools.jackson.databind.JsonNode
import tools.jackson.databind.ObjectMapper
import java.time.Instant
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

/** Real HTTP, Spring Security, transactions, and Postgres; only GitHub is mocked. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
class ApiHttpIntegrationTests {
    @LocalServerPort
    private var port: Int = 0

    @Autowired
    private lateinit var users: UserRepository

    @Autowired
    private lateinit var identities: IdentityRepository

    @Autowired
    private lateinit var tokens: AppTokenService

    @Autowired
    private lateinit var decoder: JwtDecoder

    @Autowired
    private lateinit var jdbc: JdbcTemplate

    @Autowired
    private lateinit var json: ObjectMapper

    @MockitoBean
    private lateinit var github: GitHubIdentityClient

    private val email = "http-${UUID.randomUUID()}@example.test"
    private val providerId = UUID.randomUUID().toString()

    // HTTP handlers run on server threads, so cleanup must not rely on a test transaction.
    @AfterEach
    fun cleanUp() {
        jdbc.update("DELETE FROM public.users WHERE email = ?", email)
    }

    private fun request(): RequestSpecification = given()
        .baseUri("http://127.0.0.1")
        .port(port)
        .accept(ContentType.JSON)

    private fun loginRequest(code: String = "test-code", verifier: String = "v".repeat(43)) =
        json.writeValueAsString(
            mapOf(
                "code" to code,
                "codeVerifier" to verifier,
                "redirectUri" to "http://localhost:8081/auth",
            ),
        )

    private fun verifiedGitHub() {
        `when`(github.exchange(anyString(), anyString(), anyString())).thenReturn(
            ProviderIdentity(AuthProvider.GITHUB, providerId, email, true, "HTTP Test User"),
        )
    }

    private fun parse(body: String): JsonNode = json.readTree(body)

    private fun assertProblem(body: String, status: Int, path: String) {
        val problem = parse(body)
        assertEquals(status, problem.path("status").intValue())
        assertEquals(path, problem.path("instance").stringValue())
        assertTrue(problem.path("title").stringValue().isNotBlank())
    }

    @Test
    fun `login persists identity returns a signed token and authenticates me over HTTP`() {
        verifiedGitHub()

        val login = request().contentType(ContentType.JSON).body(loginRequest())
            .post("/api/v1/auth/github")
            .then().statusCode(200).contentType(ContentType.JSON)
            .header("Cache-Control", "no-store")
            .header("Pragma", "no-cache")
            .extract().asString()

        val result = parse(login)
        val token = result.path("token").stringValue()
        val userId = result.path("user").path("id").stringValue()
        assertEquals(userId, decoder.decode(token).subject)
        assertEquals(email, result.path("user").path("email").stringValue())
        assertEquals(5, result.path("user").size())
        assertFalse(result.has("access_token"))

        val me = request().header("Authorization", "Bearer $token")
            .get("/api/v1/me")
            .then().statusCode(200).contentType(ContentType.JSON)
            .header("Cache-Control", "no-store")
            .extract().asString()
        val profile = parse(me)
        for (field in listOf("id", "email", "display_name", "role")) {
            assertEquals(result.path("user").path(field), profile.path(field))
        }
        // Postgres can round Instant nanoseconds when the profile is reloaded.
        Instant.parse(profile.path("created_at").stringValue())

        val repeated = request().contentType(ContentType.JSON).body(loginRequest(code = "second-code"))
            .post("/api/v1/auth/github")
            .then().statusCode(200).extract().asString()
        assertEquals(userId, parse(repeated).path("user").path("id").stringValue())
        assertEquals(1, identities.findAllByUser_Id(UUID.fromString(userId)).size)
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM public.users WHERE email = ?", Long::class.java, email))
    }

    @Test
    fun `invalid PKCE returns 400 without reaching GitHub or creating an account`() {
        val body = request().contentType(ContentType.JSON).body(loginRequest(verifier = "invalid"))
            .post("/api/v1/auth/github")
            .then().statusCode(400).contentType("application/problem+json")
            .extract().asString()
        assertProblem(body, 400, "/api/v1/auth/github")
        assertTrue(parse(body).path("errors").any { it.path("field").stringValue() == "codeVerifier" })
        verifyNoInteractions(github)
        assertTrue(users.findByEmail(email) == null)
    }

    @Test
    fun `missing token returns 401 through the real server security filter`() {
        val body = request().get("/api/v1/me")
            .then().statusCode(401).contentType("application/problem+json")
            .header("WWW-Authenticate", "Bearer")
            .extract().asString()
        assertProblem(body, 401, "/api/v1/me")
        verifyNoInteractions(github)
    }

    @Test
    fun `malformed token returns 401 through the real server security filter`() {
        val body = request().header("Authorization", "Bearer not-a-jwt").get("/api/v1/me")
            .then().statusCode(401).contentType("application/problem+json")
            .extract().asString()
        assertProblem(body, 401, "/api/v1/me")
    }

    @Test
    fun `regular user gets 403 for the admin namespace over HTTP`() {
        val user = users.saveAndFlush(User(email = email))
        val body = request().header("Authorization", "Bearer ${tokens.issueFor(user)}")
            .get("/api/v1/admin/users")
            .then().statusCode(403).contentType("application/problem+json")
            .extract().asString()
        // This checks namespace authorization, not an unimplemented admin operation.
        assertProblem(body, 403, "/api/v1/admin/users")
    }

    @Test
    fun `missing catalog part returns 404 from the real database-backed route`() {
        val id = UUID.randomUUID()
        val body = request().get("/api/v1/parts/$id")
            .then().statusCode(404).contentType("application/problem+json")
            .extract().asString()
        assertProblem(body, 404, "/api/v1/parts/$id")
    }

    @Test
    fun `verified email conflict returns 409 and retains only the original identity`() {
        val user = users.saveAndFlush(User(email = email))
        identities.saveAndFlush(Identity(user, AuthProvider.GOOGLE, "google-$providerId"))
        verifiedGitHub()

        val body = request().contentType(ContentType.JSON).body(loginRequest())
            .post("/api/v1/auth/github")
            .then().statusCode(409).contentType("application/problem+json")
            .extract().asString()
        assertProblem(body, 409, "/api/v1/auth/github")
        assertTrue(parse(body).path("detail").stringValue().contains("Google"))
        val retained = identities.findAllByUser_Id(assertNotNull(user.id))
        assertEquals(listOf(AuthProvider.GOOGLE), retained.map { it.provider })
        assertEquals(1L, jdbc.queryForObject("SELECT count(*) FROM public.users WHERE email = ?", Long::class.java, email))
    }

    @Test
    fun `unverified provider email returns 400 and creates no account`() {
        `when`(github.exchange(anyString(), anyString(), anyString())).thenThrow(EmailNotVerifiedException())
        val body = request().contentType(ContentType.JSON).body(loginRequest())
            .post("/api/v1/auth/github")
            .then().statusCode(400).contentType("application/problem+json")
            .extract().asString()
        assertProblem(body, 400, "/api/v1/auth/github")
        assertTrue(users.findByEmail(email) == null)
    }

    @Test
    fun `Swagger UI and handwritten contract are served without authentication`() {
        val contract = request().accept("*/*").get("/openapi.yaml")
            .then().statusCode(200).extract().asString()
        assertTrue(contract.startsWith("openapi: 3.0.3"))
        assertTrue(contract.contains("  /auth/github:"))
        assertTrue(contract.contains("x-implementation-status: planned"))

        val html = request().accept("text/html").get("/swagger-ui/index.html")
            .then().statusCode(200).extract().asString()
        assertTrue(html.contains("Swagger UI"))

        val config = request().get("/v3/api-docs/swagger-config")
            .then().statusCode(200).extract().asString()
        assertEquals("/openapi.yaml", parse(config).path("url").stringValue())
    }

    @Test
    fun `SpringDoc exposes implemented routes and the Bearer scheme`() {
        val generated = request().get("/v3/api-docs")
            .then().statusCode(200).contentType(ContentType.JSON)
            .extract().asString()
        val document = parse(generated)
        assertTrue(document.path("paths").has("/api/v1/auth/github"))
        assertTrue(document.path("paths").has("/api/v1/me"))
        assertFalse(document.path("paths").has("/api/v1/auth/google"))
        assertEquals("bearer", document.path("components").path("securitySchemes").path("bearerAuth").path("scheme").stringValue())
        val security = document.path("paths").path("/api/v1/me").path("get").path("security")
        assertTrue(security.any { it.has("bearerAuth") })
    }
}
