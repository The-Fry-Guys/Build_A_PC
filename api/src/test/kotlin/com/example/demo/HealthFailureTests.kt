package com.example.demo

import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataAccessResourceFailureException
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get

/** Verifies readiness responses when database access fails. */
@WebMvcTest(HelloController::class)
@Import(SecurityConfig::class)
class HealthFailureTests @Autowired constructor(private val mvc: MockMvc) {
    @MockitoBean
    private lateinit var jdbcTemplate: JdbcTemplate

    @MockitoBean
    private lateinit var jwtDecoder: JwtDecoder

    /** Verifies that a database outage returns HTTP 503 with DOWN readiness fields. */
    @Test
    fun `database outage returns 503 without connection details`() {
        `when`(jdbcTemplate.queryForObject("SELECT 1", Int::class.java))
            .thenThrow(DataAccessResourceFailureException("private connection information"))
        mvc.get("/api/v1/health").andExpect {
            status { isServiceUnavailable() }
            content {
                contentTypeCompatibleWith("application/json")
                string("""{"status":"DOWN","database":"DOWN"}""")
            }
        }
    }
}
