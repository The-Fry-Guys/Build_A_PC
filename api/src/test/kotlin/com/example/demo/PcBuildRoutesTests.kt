package com.example.demo

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import org.springframework.test.web.servlet.delete
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PcBuildRoutesTests @Autowired constructor(
    private val mvc: MockMvc,
    private val repository: PCBuildRepository,
    private val objectMapper: tools.jackson.databind.ObjectMapper,
) {
    private val owner = UUID.fromString("11111111-1111-1111-1111-111111111111")
    private val otherUser = UUID.fromString("22222222-2222-2222-2222-222222222222")
    private val olderBuild = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    private val newerBuild = UUID.fromString("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")

    @BeforeEach
    fun seedBuilds() {
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

            val id = objectMapper.readTree(result.response.contentAsString)
                .get("id").asString()
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
