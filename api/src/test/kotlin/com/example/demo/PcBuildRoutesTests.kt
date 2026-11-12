package com.example.demo

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import jakarta.persistence.EntityManager
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.context.annotation.Import
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.delete
import org.springframework.test.web.servlet.put
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
@Transactional
class PcBuildRoutesTests @Autowired constructor(
    private val mvc: MockMvc,
    private val repository: PCBuildRepository,
    private val partRepository: CatalogPartRepository,
    private val userRepository: UserRepository,
    private val entityManager: EntityManager,
    private val objectMapper: tools.jackson.databind.ObjectMapper,
) {
    private lateinit var owner: UUID
    private lateinit var otherUser: UUID
    private val olderBuild = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    private val newerBuild = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

    @BeforeEach
    fun seedBuilds() {
        val users = userRepository.saveAllAndFlush(
            listOf(
                User(email = "${UUID.randomUUID()}@example.test"),
                User(email = "${UUID.randomUUID()}@example.test"),
            ),
        )
        owner = requireNotNull(users[0].id)
        otherUser = requireNotNull(users[1].id)
        repository.deleteAll()
        repository.saveAllAndFlush(
            listOf(
                PCBuild(olderBuild, owner, "Started build", createdAt = Instant.parse("2026-01-01T00:00:00Z")),
                PCBuild(newerBuild, owner, "Finished build", createdAt = Instant.parse("2026-02-01T00:00:00Z")),
                PCBuild(UUID.randomUUID(), otherUser, "Private build", createdAt = Instant.parse("2026-03-01T00:00:00Z")),
            ),
        )
    }

    @Test
    fun `anonymous requests are rejected`() {
        mvc.get("/api/v1/builds").andExpect {
            status { isUnauthorized() }
            content { contentTypeCompatibleWith("application/problem+json") }
        }
        mvc.post("/api/v1/builds") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Test","partIds":[]}"""
        }.andExpect { status { isUnauthorized() } }
        mvc.delete("/api/v1/builds/$olderBuild").andExpect { status { isUnauthorized() } }
        mvc.get("/api/v1/builds/$olderBuild").andExpect { status { isUnauthorized() } }
        mvc.put("/api/v1/builds/$olderBuild") {
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Test","partIds":[]}"""
        }.andExpect { status { isUnauthorized() } }
    }

    @Test
    fun `a non UUID principal is rejected`() {
        mvc.get("/api/v1/builds") { with(user("not-a-user-id")) }.andExpect {
            status { isUnauthorized() }
            content { contentTypeCompatibleWith("application/problem+json") }
        }
    }

    @Test
    fun `only the authenticated users builds are returned`() {
        mvc.get("/api/v1/builds?user_id=$otherUser") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
            jsonPath("$.content[0].build_id") { value(newerBuild.toString()) }
            jsonPath("$.content[0].user_id") { value(owner.toString()) }
            jsonPath("$.content[0].name") { value("Finished build") }
            jsonPath("$.content[0].created_at") { value("2026-02-01T00:00:00Z") }
            jsonPath("$.content[1].build_id") { value(olderBuild.toString()) }
            jsonPath("$.totalElements") { value(2) }
            jsonPath("$.totalPages") { value(1) }
        }
    }

    @Test
    fun `pagination and totals are scoped to the authenticated user`() {
        mvc.get("/api/v1/builds?page=1&size=1") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(1) }
            jsonPath("$.content[0].build_id") { value(olderBuild.toString()) }
            jsonPath("$.page") { value(1) }
            jsonPath("$.size") { value(1) }
            jsonPath("$.totalElements") { value(2) }
            jsonPath("$.totalPages") { value(2) }
        }
    }

    @Test
    fun `user with no builds receives an empty page`() {
        mvc.get("/api/v1/builds") { with(user(UUID.randomUUID().toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(0) }
            jsonPath("$.totalElements") { value(0) }
            jsonPath("$.totalPages") { value(0) }
        }
    }

    @Test
    fun `created empty build appears in owners list and can be deleted`() {
        val result = mvc.post("/api/v1/builds") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"New build","partIds":[]}"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.parts.length()") { value(0) }
        }.andReturn()

        val id = objectMapper.readTree(result.response.contentAsString).get("id").asString()
        mvc.get("/api/v1/builds") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(3) }
            jsonPath("$.content[0].build_id") { value(id) }
        }
        mvc.delete("/api/v1/builds/$id") { with(user(otherUser.toString())) }.andExpect {
            status { isForbidden() }
        }
        mvc.delete("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            status { isNoContent() }
        }
        mvc.get("/api/v1/builds") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
        }
    }

    @Test
    fun `blank names and duplicate part ids are rejected`() {
        val partId = UUID.randomUUID()
        for (body in listOf(
        """{"name":" ","partIds":[]}""",
        """{"name":"Build","partIds":["$partId","$partId"]}""",
        )) {
        mvc.post("/api/v1/builds") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = body
        }.andExpect { status { isBadRequest() } }
        }
    }

    @Test
    fun `build parts and name persist across create update and reload`() {
        val first = partRepository.saveAndFlush(CatalogPart(category = "cpu", name = "First"))
        val second = partRepository.saveAndFlush(CatalogPart(category = "video-card", name = "Second"))
        val result = mvc.post("/api/v1/builds") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Draft","partIds":["${first.id}"]}"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.parts[0].part_id") { value(first.id.toString()) }
            jsonPath("$.parts[0].quantity") { value(1) }
        }.andReturn()
        val id = objectMapper.readTree(result.response.contentAsString).get("id").asString()
        entityManager.flush()
        entityManager.clear()

        mvc.get("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Draft") }
            jsonPath("$.parts[0].part_id") { value(first.id.toString()) }
        }
        mvc.put("/api/v1/builds/$id") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Updated build","partIds":["${second.id}"]}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Updated build") }
            jsonPath("$.parts[0].part_id") { value(second.id.toString()) }
        }
        entityManager.flush()
        entityManager.clear()
        mvc.get("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Updated build") }
            jsonPath("$.parts.length()") { value(1) }
            jsonPath("$.parts[0].part_id") { value(second.id.toString()) }
        }
        mvc.put("/api/v1/builds/$id") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Empty draft","partIds":[]}"""
        }.andExpect { status { isOk() } }
        entityManager.flush()
        entityManager.clear()
        mvc.get("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Empty draft") }
            jsonPath("$.parts.length()") { value(0) }
        }
    }

    @Test
    fun `quantities persist through creation replacement and deletion`() {
        val part = partRepository.saveAndFlush(CatalogPart(category = "memory", name = "Memory"))
        val result = mvc.post("/api/v1/builds") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Draft","parts":[{"partId":"${part.id}","quantity":2}]}"""
        }.andExpect {
            status { isCreated() }
            jsonPath("$.parts[0].quantity") { value(2) }
        }.andReturn()
        val id = objectMapper.readTree(result.response.contentAsString).get("id").asString()
        entityManager.flush()
        entityManager.clear()
        mvc.get("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.parts[0].part_id") { value(part.id.toString()) }
            jsonPath("$.parts[0].quantity") { value(2) }
        }
        mvc.put("/api/v1/builds/$id") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Updated","parts":[{"partId":"${part.id}","quantity":3}]}"""
        }.andExpect {
            status { isOk() }
            jsonPath("$.parts[0].quantity") { value(3) }
        }
        entityManager.flush()
        entityManager.clear()
        mvc.get("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect {
            jsonPath("$.parts[0].quantity") { value(3) }
        }
        mvc.delete("/api/v1/builds/$id") { with(user(owner.toString())) }.andExpect { status { isNoContent() } }
        entityManager.flush()
        val remaining = entityManager.createNativeQuery("select count(*) from build_parts where build_id = :id")
            .setParameter("id", UUID.fromString(id)).singleResult as Number
        org.junit.jupiter.api.Assertions.assertEquals(0L, remaining.toLong())
    }

    @Test
    fun `detail and update enforce ownership and missing builds`() {
        mvc.get("/api/v1/builds/$olderBuild") { with(user(otherUser.toString())) }.andExpect {
            status { isForbidden() }
        }
        mvc.put("/api/v1/builds/$olderBuild") {
            with(user(otherUser.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Unauthorized","partIds":[]}"""
        }.andExpect { status { isForbidden() } }
        val missing = UUID.randomUUID()
        mvc.get("/api/v1/builds/$missing") { with(user(owner.toString())) }.andExpect { status { isNotFound() } }
        mvc.put("/api/v1/builds/$missing") {
            with(user(owner.toString()))
            contentType = org.springframework.http.MediaType.APPLICATION_JSON
            content = """{"name":"Missing","partIds":[]}"""
        }.andExpect { status { isNotFound() } }
        mvc.get("/api/v1/builds/$olderBuild") { with(user(owner.toString())) }.andExpect {
            jsonPath("$.name") { value("Started build") }
        }
    }

    @Test
    fun `invalid update does not modify the stored build`() {
        val missingPart = UUID.randomUUID()
        val invalidBodies = listOf(
            """{"name":" ","partIds":[]}""",
            """{"name":"${"x".repeat(256)}","partIds":[]}""",
            """{"name":"Changed","partIds":["$missingPart"]}""",
            """{"name":"Changed","partIds":["$missingPart","$missingPart"]}""",
            """{"name":"Changed"}""",
            """{"name":"Changed","partIds":["not-a-uuid"]}""",
            """{"name":"Changed","parts":[{"partId":"$missingPart","quantity":0}]}""",
            """{"name":"Changed","parts":[{"partId":"$missingPart","quantity":-1}]}""",
            """{"name":"Changed","parts":[{"partId":"$missingPart"}]}""",
            """{"name":"Changed","parts":[{"partId":"$missingPart","quantity":1},{"partId":"$missingPart","quantity":2}]}""",
            """{"name":"Changed","partIds":[],"parts":[]}""",
        )
        for (body in invalidBodies) {
            mvc.put("/api/v1/builds/$olderBuild") {
                with(user(owner.toString()))
                contentType = org.springframework.http.MediaType.APPLICATION_JSON
                content = body
            }.andExpect { status { isBadRequest() } }
        }
        entityManager.flush()
        entityManager.clear()
        mvc.get("/api/v1/builds/$olderBuild") { with(user(owner.toString())) }.andExpect {
            status { isOk() }
            jsonPath("$.name") { value("Started build") }
            jsonPath("$.parts.length()") { value(0) }
        }
    }

    @ParameterizedTest
    @ValueSource(strings = ["page=-1", "size=0", "size=101", "page=abc", "page=2147483647&size=100"])
    fun `invalid pagination is rejected`(query: String) {
        mvc.get("/api/v1/builds?$query") { with(user(owner.toString())) }.andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
        }
    }
}
