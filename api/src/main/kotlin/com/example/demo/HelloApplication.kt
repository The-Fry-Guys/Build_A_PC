package com.example.demo

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.dao.DataAccessException

/** Exposes API information and database readiness under the versioned base route. */
@RestController
@RequestMapping("/api/v1", produces = [MediaType.APPLICATION_JSON_VALUE])
class HelloController(private val jdbcTemplate: JdbcTemplate) {
    /** Returns the API name and version. */
    @GetMapping("", "/")
    fun index() = ApiInfo(name = "Build A PC API", version = "v1")

    /** Checks database readiness and returns 503 when the query fails. */
    @GetMapping("/health")
    fun health(): ResponseEntity<ApiHealth> {
        val connected = try {
            jdbcTemplate.queryForObject("SELECT 1", Int::class.java) == 1
        } catch (_: DataAccessException) {
            false
        }
        return ResponseEntity.status(if (connected) HttpStatus.OK else HttpStatus.SERVICE_UNAVAILABLE)
            .body(ApiHealth(if (connected) "UP" else "DOWN", if (connected) "UP" else "DOWN"))
    }
}

/** Carries the public API name and version. */
data class ApiInfo(val name: String, val version: String)
/** Carries overall readiness and database availability without connection details. */
data class ApiHealth(val status: String, val database: String)
