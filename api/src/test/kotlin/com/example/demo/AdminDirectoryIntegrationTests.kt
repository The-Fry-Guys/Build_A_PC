package com.example.demo

import io.restassured.RestAssured.given
import org.hamcrest.Matchers.equalTo
import org.hamcrest.Matchers.hasSize
import org.hamcrest.Matchers.nullValue
import io.restassured.http.ContentType
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.test.web.server.LocalServerPort
import org.springframework.context.ApplicationContext
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import java.math.BigDecimal
import kotlin.test.assertFalse

/** Exercises real HTTP authorization and SQL search against disposable PostgreSQL. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
class AdminDirectoryIntegrationTests {
    @LocalServerPort
    private var port: Int = 0
    @Autowired private lateinit var users: UserRepository
    @Autowired private lateinit var parts: CatalogPartRepository
    @Autowired private lateinit var tokens: AppTokenService
    @Autowired private lateinit var jdbc: JdbcTemplate
    @Autowired private lateinit var context: ApplicationContext
    private lateinit var admin: User
    private lateinit var regular: User
    private lateinit var token: String

    /** Seeds only the disposable database, including literal search punctuation and nullable fields. */
    @BeforeEach
    fun seed() {
        jdbc.execute("TRUNCATE public.users, public.catalog_parts CASCADE")
        admin = users.saveAndFlush(User(email = "admin@example.test", role = UserRole.ADMIN))
        regular = users.saveAndFlush(User(email = "member@example.test", displayName = "Directory Member"))
        users.saveAndFlush(User(email = "other@example.test", displayName = "Directory 100%_Member"))
        parts.saveAllAndFlush(listOf(
            CatalogPart(category = "cpu", name = "Directory CPU", price = BigDecimal("200.00")),
            CatalogPart(category = "memory", name = "Directory 100%_Memory", price = null),
        ))
        token = tokens.issueFor(admin)
    }

    /** Private lists require a valid token and a current administrator account. */
    @Test
    fun `admin authorization and safe profile fields`() {
        given().port(port).get("/api/v1/admin/users").then().statusCode(401)
        given().port(port).auth().oauth2("not-a-token").get("/api/v1/admin/users").then().statusCode(401)
        given().port(port).auth().oauth2(tokens.issueFor(regular)).get("/api/v1/admin/users").then().statusCode(403)
        given().port(port).auth().oauth2(token).queryParam("q", "admin@example.test")
            .get("/api/v1/admin/users").then().statusCode(200).header("Cache-Control", "no-store")
            .body("content", hasSize<Any>(1)).body("content[0].role", equalTo("ADMIN"))
            .body("content[0].display_name", nullValue()).body("content[0].identities", nullValue())
    }

    /** Search counts span the whole database rather than filtering a page in memory. */
    @Test
    fun `users search across pages and retain totals`() {
        val first = given().port(port).auth().oauth2(token).queryParam("q", " DIRECTORY ").queryParam("size", 1)
            .get("/api/v1/admin/users").then().statusCode(200).body("totalElements", equalTo(2))
            .body("totalPages", equalTo(2)).extract().path<String>("content[0].id")
        val second = given().port(port).auth().oauth2(token)
            .queryParam("q", "directory").queryParam("size", 1).queryParam("page", 1)
            .get("/api/v1/admin/users").then().statusCode(200).extract().path<String>("content[0].id")
        kotlin.test.assertNotEquals(first, second)
        given().port(port).auth().oauth2(token).queryParam("q", "directory").queryParam("page", 10)
            .get("/api/v1/admin/users").then().statusCode(200)
            .body("content", hasSize<Any>(0)).body("totalElements", equalTo(2))
    }

    /** Percent, underscore, case, UUIDs, and null prices follow the documented search contract. */
    @Test
    fun `literal search and public catalog behavior`() {
        given().port(port).auth().oauth2(token).queryParam("q", "100%_")
            .get("/api/v1/admin/users").then().statusCode(200).body("totalElements", equalTo(1))
        given().port(port).queryParam("q", "100%_").get("/api/v1/parts").then().statusCode(200)
            .body("totalElements", equalTo(1)).body("content[0].price", nullValue())
        given().port(port).queryParam("q", "CPU").get("/api/v1/parts").then()
            .statusCode(200).body("totalElements", equalTo(1))
        given().port(port).auth().oauth2(token).queryParam("q", regular.id.toString()).get("/api/v1/admin/users")
            .then().statusCode(200).body("content[0].id", equalTo(regular.id.toString()))
        given().port(port).queryParam("q", "' OR 1=1 --").get("/api/v1/parts").then()
            .statusCode(200).body("totalElements", equalTo(0))
    }

    /** Demotion must reject the exact token that worked before the database change. */
    @Test
    fun `revoked admin JWT immediately receives forbidden`() {
        given().port(port).auth().oauth2(token).get("/api/v1/admin/users").then().statusCode(200)
        jdbc.update("UPDATE public.users SET role = 'USER' WHERE id = ?", admin.id)
        given().port(port).auth().oauth2(token).get("/api/v1/admin/users").then().statusCode(403)
        given().port(port).auth().oauth2(token).get("/api/v1/me").then().statusCode(200).body("role", equalTo("USER"))
    }

    /** Both list routes enforce the same bounded pagination and sanitized error contract. */
    @Test
    fun `invalid pagination returns problem details`() {
        for (route in listOf("parts", "admin/users")) {
            for (query in listOf("page=-1", "size=101", "page=abc", "page=2147483647&size=100")) {
                given().port(port).auth().oauth2(token).get("/api/v1/$route?$query").then()
                    .statusCode(400).contentType("application/problem+json")
            }
        }
    }

    /** User updates expose only approved fields, validate input, and protect the active admin. */
    @Test
    fun `admin can edit and delete users without editing roles or deleting self`() {
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"email":"updated@example.test","displayName":"Updated Member","role":"ADMIN"}""")
            .put("/api/v1/admin/users/${regular.id}").then().statusCode(200)
            .body("email", equalTo("updated@example.test"))
            .body("display_name", equalTo("Updated Member"))
            .body("role", equalTo("USER"))

        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"email":"admin@example.test","displayName":"Other"}""")
            .put("/api/v1/admin/users/${regular.id}").then().statusCode(409)
            .contentType("application/problem+json")
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"email":"not-an-email","displayName":"Member"}""")
            .put("/api/v1/admin/users/${regular.id}").then().statusCode(400)
            .contentType("application/problem+json")
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"email":"valid@example.test","displayName":"Member"}""")
            .put("/api/v1/admin/users/${java.util.UUID.randomUUID()}").then().statusCode(404)

        given().port(port).auth().oauth2(token).delete("/api/v1/admin/users/${admin.id}")
            .then().statusCode(409).contentType("application/problem+json")
        given().port(port).auth().oauth2(token).delete("/api/v1/admin/users/${regular.id}")
            .then().statusCode(204)
        kotlin.test.assertNull(users.findById(regular.id!!).orElse(null))
    }

    /** User mutation routes keep database-backed admin authorization and missing-ID semantics. */
    @Test
    fun `user mutations require an administrator`() {
        val body = """{"email":"member@example.test","displayName":"Member"}"""
        given().port(port).contentType(ContentType.JSON).body(body)
            .put("/api/v1/admin/users/${regular.id}").then().statusCode(401)
        given().port(port).auth().oauth2(tokens.issueFor(regular)).contentType(ContentType.JSON).body(body)
            .put("/api/v1/admin/users/${regular.id}").then().statusCode(403)
        given().port(port).auth().oauth2(tokens.issueFor(regular)).delete("/api/v1/admin/users/${regular.id}")
            .then().statusCode(403)
    }

    /** Catalog mutations validate payloads and refuse deletion while saved builds reference a part. */
    @Test
    fun `admin can create edit and safely delete catalog parts`() {
        val payload = """{"category":"cpu","name":"New CPU","price":99.95}"""
        given().port(port).contentType(ContentType.JSON).body(payload).post("/api/v1/parts")
            .then().statusCode(401)
        given().port(port).auth().oauth2(tokens.issueFor(regular)).contentType(ContentType.JSON).body(payload)
            .post("/api/v1/parts").then().statusCode(403)
        val id = given().port(port).auth().oauth2(token).contentType(ContentType.JSON).body(payload)
            .post("/api/v1/parts").then().statusCode(201).body("category", equalTo("cpu"))
            .body("name", equalTo("New CPU")).extract().path<String>("part_id")
        jdbc.update("INSERT INTO public.cpu_details (part_id) VALUES (?)", java.util.UUID.fromString(id))
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"category":"invalid","name":"Bad part","price":-1}""")
            .post("/api/v1/parts").then().statusCode(400).contentType("application/problem+json")
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"category":"memory","name":"Updated CPU","price":120.00}""")
            .put("/api/v1/parts/$id").then().statusCode(409).contentType("application/problem+json")
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON)
            .body("""{"category":"cpu","name":"Updated CPU","price":120.00}""")
            .put("/api/v1/parts/$id").then().statusCode(200)
            .body("category", equalTo("cpu")).body("name", equalTo("Updated CPU"))
        given().port(port).auth().oauth2(token).contentType(ContentType.JSON).body(payload)
            .put("/api/v1/parts/${java.util.UUID.randomUUID()}").then().statusCode(404)
        given().port(port).auth().oauth2(token).delete("/api/v1/parts/$id").then().statusCode(204)
        given().port(port).auth().oauth2(token).delete("/api/v1/parts/$id").then().statusCode(404)

        val referencedPart = parts.findAll().first()
        val buildId = java.util.UUID.randomUUID()
        jdbc.update(
            "INSERT INTO public.pc_builds (id, user_id, name) VALUES (?, ?, ?)",
            buildId, regular.id, "Reference fixture",
        )
        jdbc.update(
            "INSERT INTO public.build_parts (build_id, catalog_part_id, quantity) VALUES (?, ?, ?)",
            buildId, referencedPart.id, 1,
        )
        val conflict = given().port(port).auth().oauth2(token)
            .delete("/api/v1/parts/${referencedPart.id}").then().statusCode(409)
            .contentType("application/problem+json").extract().asString()
        kotlin.test.assertTrue(conflict.contains("selected by one or more saved builds"))
        kotlin.test.assertTrue(parts.existsById(referencedPart.id))
    }

    /** A normal application context must never contain the test token controller. */
    @Test
    fun `test token hook is absent outside e2e`() {
        assertFalse(context.containsBean("e2eAuthController"))
        given().port(port).post("/api/v1/test/token?email=e2e-admin@example.test").then().statusCode(404)
    }
}
