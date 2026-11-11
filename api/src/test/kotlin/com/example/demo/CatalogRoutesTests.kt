package com.example.demo

import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.transaction.annotation.Transactional
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

/** Verifies versioned API routes and JPA pagination against an isolated H2 database. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class CatalogRoutesTests @Autowired constructor(
    private val mvc: MockMvc,
    private val repository: CatalogPartRepository,
) {
    private val firstId = UUID.fromString("11111111-1111-1111-1111-111111111111")
    private val secondId = UUID.fromString("22222222-2222-2222-2222-222222222222")

    /** Seeds two known parts in reverse order to check deterministic pagination. */
    @BeforeEach
    fun seedCatalog() {
        repository.deleteAll()
        // Insert in reverse order to verify that pagination sorts in the database.
        repository.saveAllAndFlush(listOf(
            CatalogPart(secondId, "Memory", "32 GB kit", BigDecimal("89.99"), Instant.parse("2026-01-01T00:00:00Z")),
            CatalogPart(firstId, "CPU", "8-core CPU", BigDecimal("249.99"), Instant.parse("2026-01-01T00:00:00Z")),
        ))
    }

    /** Verifies API information at both supported forms of the versioned base path. */
    @Test
    fun `API root is versioned`() {
        for (path in listOf("/api/v1", "/api/v1/")) {
            mvc.get(path).andExpect {
                status { isOk() }
                jsonPath("$.name") { value("Build A PC API") }
                jsonPath("$.version") { value("v1") }
            }
        }
    }

    /** Verifies that Actuator reports healthy database readiness without exposing details. */
    @Test
    fun `health checks the database`() {
        mvc.get("/actuator/health").andExpect {
            status { isOk() }
            jsonPath("$.status") { value("UP") }
            jsonPath("$.components") { doesNotExist() }
        }
    }

    /** Verifies that every implemented GET route returns the documented JSON content type. */
    @ParameterizedTest
    @ValueSource(strings = ["/api/v1/", "/actuator/health", "/api/v1/parts", "/api/v1/parts/11111111-1111-1111-1111-111111111111"])
    fun `successful routes return their documented json content type`(path: String) {
        mvc.get(path).andExpect {
            status { isOk() }
            content {
                contentTypeCompatibleWith(
                    if (path == "/actuator/health") "application/vnd.spring-boot.actuator.v3+json"
                    else "application/json",
                )
            }
        }
    }

    /** Verifies that the documented maximum page size is accepted. */
    @Test
    fun `maximum page size is accepted`() {
        mvc.get("/api/v1/parts?size=100").andExpect {
            status { isOk() }
            jsonPath("$.size") { value(100) }
            jsonPath("$.content.length()") { value(2) }
        }
    }

    /** Verifies default pagination and the documented catalog response fields. */
    @Test
    fun `catalog defaults and fields follow the API contract`() {
        mvc.get("/api/v1/parts").andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(2) }
            jsonPath("$.content[0].part_id") { value(firstId.toString()) }
            jsonPath("$.content[0].created_at") { value("2026-01-01T00:00:00Z") }
            jsonPath("$.content[0].id") { doesNotExist() }
            jsonPath("$.page") { value(0) }
            jsonPath("$.size") { value(10) }
            jsonPath("$.totalElements") { value(2) }
            jsonPath("$.totalPages") { value(1) }
        }
    }

    /** Verifies that successive pages return distinct records in ID order. */
    @Test
    fun `catalog pages contain distinct database records`() {
        for ((page, id) in listOf(firstId, secondId).withIndex()) {
            mvc.get("/api/v1/parts?page=$page&size=1").andExpect {
                status { isOk() }
                jsonPath("$.content.length()") { value(1) }
                jsonPath("$.content[0].part_id") { value(id.toString()) }
                jsonPath("$.page") { value(page) }
                jsonPath("$.size") { value(1) }
                jsonPath("$.totalElements") { value(2) }
                jsonPath("$.totalPages") { value(2) }
            }
        }
    }

    /** Verifies that pages beyond the catalog retain totals with empty content. */
    @Test
    fun `out of range page returns empty content with totals`() {
        mvc.get("/api/v1/parts?page=5&size=1").andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(0) }
            jsonPath("$.totalElements") { value(2) }
            jsonPath("$.totalPages") { value(2) }
        }
    }

    /** Verifies that an empty catalog returns empty content and zero totals. */
    @Test
    fun `empty catalog has zero pages`() {
        repository.deleteAllInBatch()
        mvc.get("/api/v1/parts").andExpect {
            status { isOk() }
            jsonPath("$.content.length()") { value(0) }
            jsonPath("$.totalElements") { value(0) }
            jsonPath("$.totalPages") { value(0) }
        }
    }

    /** Verifies that invalid pagination values return HTTP 400 Problem Details. */
    @ParameterizedTest
    @ValueSource(strings = ["page=-1", "size=0", "size=-1", "size=101", "page=abc", "size=abc", "page=2147483647&size=100", "page=2147483648"])
    fun `invalid pagination returns problem details`(query: String) {
        mvc.get("/api/v1/parts?$query").andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Bad Request") }
            jsonPath("$.status") { value(400) }
            jsonPath("$.instance") { value("/api/v1/parts") }
        }
    }

    /** Verifies that UUID lookup returns the persisted part's public fields. */
    @Test
    fun `single part returns stored data`() {
        mvc.get("/api/v1/parts/$firstId").andExpect {
            status { isOk() }
            jsonPath("$.part_id") { value(firstId.toString()) }
            jsonPath("$.category") { value("CPU") }
            jsonPath("$.name") { value("8-core CPU") }
            jsonPath("$.price") { value(249.99) }
            jsonPath("$.created_at") { value("2026-01-01T00:00:00Z") }
        }
    }

    /** Verifies that a database part with no price is returned with a null price. */
    @Test
    fun `part with missing price returns null instead of failing`() {
        val id = UUID.fromString("33333333-3333-3333-3333-333333333333")
        repository.saveAndFlush(
            CatalogPart(id, "Case", "Case with unknown price", null, Instant.parse("2026-01-01T00:00:00Z")),
        )

        mvc.get("/api/v1/parts/$id").andExpect {
            status { isOk() }
            jsonPath("$.part_id") { value(id.toString()) }
            jsonPath("$.price") { value(null) }
        }
    }

    /** Verifies that an unknown part UUID returns HTTP 404 Problem Details. */
    @Test
    fun `unknown part returns problem details`() {
        mvc.get("/api/v1/parts/33333333-3333-3333-3333-333333333333").andExpect {
            status { isNotFound() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Not Found") }
            jsonPath("$.status") { value(404) }
            jsonPath("$.instance") { value("/api/v1/parts/33333333-3333-3333-3333-333333333333") }
        }
    }

    /** Verifies that malformed UUID input returns HTTP 400 Problem Details. */
    @Test
    fun `malformed part id returns bad request`() {
        mvc.get("/api/v1/parts/not-a-uuid").andExpect {
            status { isBadRequest() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Bad Request") }
            jsonPath("$.status") { value(400) }
            jsonPath("$.instance") { value("/api/v1/parts/not-a-uuid") }
        }
    }
}
