package com.example.demo

import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.security.core.Authentication
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.UUID

@RestController
@RequestMapping("/api/v1/builds", produces = [MediaType.APPLICATION_JSON_VALUE])
class PCBuildController(
    private val buildRepository: PCBuildRepository,
    private val partRepository: CatalogPartRepository,
) {
    @GetMapping
    @Transactional(readOnly = true)
    fun getMyBuilds(
        authentication: Authentication,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): PcBuildPage {
        val userId = authentication.userId()
        if (page < 0 || size !in 1..100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be nonnegative and size must be between 1 and 100")
        }
        if (page.toLong() * size > Int.MAX_VALUE) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Requested page offset is too large")
        }
        val builds = buildRepository.findAllByUserId(
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

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    fun createBuild(authentication: Authentication, @RequestBody request: CreateBuildRequest): BuildDetailResponse {
        val userId = authentication.userId()
        if (request.name.isBlank() || request.partIds.size != request.partIds.toSet().size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Build name must not be blank and part IDs must be unique.")
        }
        val parts = partRepository.findAllById(request.partIds)
        if (parts.size != request.partIds.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more parts were not found.")
        }
        return buildRepository.save(PCBuild(userId = userId, name = request.name, parts = parts.toMutableList()))
            .toBuildDetailResponse()
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    fun deleteBuild(authentication: Authentication, @PathVariable id: UUID) {
        val userId = authentication.userId()
        val build = buildRepository.findById(id).orElseThrow { ResourceNotFoundException() }
        if (build.userId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this resource.")
        }
        buildRepository.delete(build)
    }
}

private fun Authentication.userId(): UUID = try {
    UUID.fromString(name)
} catch (_: IllegalArgumentException) {
    throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user ID is invalid.")
}

data class CreateBuildRequest(val name: String, val partIds: List<UUID>)

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

data class BuildDetailResponse(
    val id: UUID,
    val name: String,
    val parts: List<PartResponse>,
    val createdAt: Instant,
)

private fun PCBuild.toBuildDetailResponse() = BuildDetailResponse(
    id = id,
    name = name,
    parts = parts.map { PartResponse(it.id, it.category, it.name, it.price, it.createdAt) },
    createdAt = createdAt,
)
