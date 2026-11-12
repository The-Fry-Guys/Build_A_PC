package com.example.demo

import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/builds", produces = [MediaType.APPLICATION_JSON_VALUE])
class PcBuildController(private val repository: PcBuildRepository) {
    @GetMapping
    fun getBuilds(
        authentication: Authentication,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): PcBuildPage {
        val userId = try {
            UUID.fromString(authentication.name)
        } catch (_: IllegalArgumentException) {
            throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user ID is invalid.")
        }

        if (page < 0 || size !in 1..100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be nonnegative and size must be between 1 and 100")
        }
        if (page.toLong() * size > Int.MAX_VALUE) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested page offset is too large")
        }

        val builds = repository.findAllByUserId(
            userId,
            PageRequest.of(page, size, Sort.by(Sort.Order.desc("createdAt"), Sort.Order.asc("id"))),
        )
        return PcBuildPage(
            content = builds.content.map { BuildResponse(it.id, it.userId, it.name, it.createdAt) },
            page = page,
            size = size,
            totalElements = builds.totalElements,
            totalPages = builds.totalPages,
        )
    }
}

data class PcBuildPage(
    val content: List<BuildResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

data class BuildResponse(
    @get:JsonProperty("build_id") val buildId: UUID,
    @get:JsonProperty("user_id") val userId: UUID,
    val name: String,
    @get:JsonProperty("created_at") val createdAt: Instant,
)
