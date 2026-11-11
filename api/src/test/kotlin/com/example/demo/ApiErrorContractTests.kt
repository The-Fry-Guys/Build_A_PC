package com.example.demo

import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataAccessResourceFailureException
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.post
import java.util.UUID

/** Verifies API error status codes, Problem Details fields, and response content types. */
@WebMvcTest(CatalogPartController::class, HelloController::class)
@Import(SecurityConfig::class)
class ApiErrorContractTests @Autowired constructor(private val mvc: MockMvc) {
    @MockitoBean
    private lateinit var repository: CatalogPartRepository

    @MockitoBean
    private lateinit var jdbcTemplate: JdbcTemplate

    @MockitoBean
    private lateinit var jwtDecoder: JwtDecoder

    /** Verifies that a catalog query failure returns sanitized HTTP 500 Problem Details. */
    @Test
    fun `catalog failure returns documented server error`() {
        `when`(repository.findAll(any(Pageable::class.java)))
            .thenThrow(DataAccessResourceFailureException("private database connection information"))
        mvc.get("/api/v1/parts").andExpect {
            status { isInternalServerError() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Internal Server Error") }
            jsonPath("$.status") { value(500) }
            jsonPath("$.detail") { value("An unexpected error occurred.") }
            jsonPath("$.instance") { value("/api/v1/parts") }
        }
    }

    /** Verifies that a failed part lookup returns HTTP 500 rather than HTTP 404. */
    @Test
    fun `part lookup failure returns documented server error`() {
        val id = UUID.fromString("11111111-1111-1111-1111-111111111111")
        `when`(repository.findById(id))
            .thenThrow(DataAccessResourceFailureException("private database connection information"))
        mvc.get("/api/v1/parts/$id").andExpect {
            status { isInternalServerError() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Internal Server Error") }
            jsonPath("$.status") { value(500) }
            jsonPath("$.detail") { value("An unexpected error occurred.") }
            jsonPath("$.instance") { value("/api/v1/parts/$id") }
        }
    }

    /** Verifies that unsupported HTTP methods preserve HTTP 405 and the Allow header. */
    @Test
    fun `unsupported method returns method not allowed`() {
        mvc.post("/api/v1/parts").andExpect {
            status { isMethodNotAllowed() }
            header { string("Allow", containsString("GET")) }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Method Not Allowed") }
            jsonPath("$.status") { value(405) }
            jsonPath("$.instance") { value("/api/v1/parts") }
        }
    }

    /** Verifies that successful API responses cannot negotiate undocumented content types. */
    @ParameterizedTest
    @ValueSource(strings = ["text/plain", "application/problem+json"])
    fun `unsupported response format returns not acceptable`(mediaType: String) {
        mvc.get("/api/v1/") { accept = MediaType.parseMediaType(mediaType) }.andExpect {
            status { isNotAcceptable() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Not Acceptable") }
            jsonPath("$.status") { value(406) }
            jsonPath("$.instance") { value("/api/v1/") }
        }
    }

    /** Verifies that unknown routes return HTTP 404 Problem Details. */
    @Test
    fun `missing route returns not found`() {
        mvc.get("/api/v1/does-not-exist").andExpect {
            status { isNotFound() }
            content { contentTypeCompatibleWith("application/problem+json") }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.title") { value("Not Found") }
            jsonPath("$.status") { value(404) }
            jsonPath("$.instance") { value("/api/v1/does-not-exist") }
        }
    }
}
