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
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.math.BigDecimal
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
        val parts = validatedParts(request)
        val build = PCBuild(userId = userId, name = request.name)
        build.parts.addAll(parts.map { (part, quantity) -> BuildPart(build = build, catalogPart = part, quantity = quantity) })
        return buildRepository.save(build).toBuildDetailResponse()
    }

    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    fun getBuild(authentication: Authentication, @PathVariable id: UUID): BuildDetailResponse =
        ownedBuild(id, authentication.userId()).toBuildDetailResponse()

    @PutMapping("/{id}")
    @Transactional
    fun updateBuild(
        authentication: Authentication,
        @PathVariable id: UUID,
        @RequestBody request: CreateBuildRequest,
    ): BuildDetailResponse {
        val build = ownedBuild(id, authentication.userId())
        val parts = validatedParts(request)
        build.name = request.name
        val requestedParts = parts.associateBy { (part, _) -> part.id }
        val existingParts = build.parts.associateBy { it.catalogPart.id }
        build.parts.removeAll { it.catalogPart.id !in requestedParts }
        parts.forEach { (part, quantity) ->
            val existing = existingParts[part.id]
            if (existing == null) {
                build.parts.add(BuildPart(build = build, catalogPart = part, quantity = quantity))
            } else {
                existing.quantity = quantity
            }
        }
        return build.toBuildDetailResponse()
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    fun deleteBuild(authentication: Authentication, @PathVariable id: UUID) {
        val build = ownedBuild(id, authentication.userId())
        buildRepository.delete(build)
    }

    private fun ownedBuild(id: UUID, userId: UUID): PCBuild {
        val build = buildRepository.findById(id).orElseThrow { ResourceNotFoundException() }
        if (build.userId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "You are not allowed to access this resource.")
        }
        return build
    }

    private fun validatedParts(request: CreateBuildRequest): List<Pair<CatalogPart, Int>> {
        if (request.name.isBlank() || request.name.length > 255 || (request.partIds == null) == (request.parts == null)) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Provide a nonblank build name of at most 255 characters and exactly one of partIds or parts.",
            )
        }
        val selections = request.parts ?: request.partIds!!.map { BuildPartWriteRequest(it, 1) }
        val ids = selections.map { it.partId }
        if (ids.size != ids.toSet().size || selections.any { it.quantity == null || it.quantity < 1 }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Part IDs must be unique and quantities must be positive.")
        }
        val parts = partRepository.findAllById(ids)
        if (parts.size != ids.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "One or more parts were not found.")
        }
        val quantities = selections.associate { it.partId to it.quantity!! }
        return parts.map { it to quantities.getValue(it.id) }
    }
}

private fun Authentication.userId(): UUID = try {
    UUID.fromString(name)
} catch (_: IllegalArgumentException) {
    throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user ID is invalid.")
}

data class CreateBuildRequest(
    val name: String,
    val partIds: List<UUID>? = null,
    val parts: List<BuildPartWriteRequest>? = null,
)

data class BuildPartWriteRequest(val partId: UUID, val quantity: Int?)

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
    val parts: List<BuildPartResponse>,
    val createdAt: Instant,
)

private fun PCBuild.toBuildDetailResponse() = BuildDetailResponse(
    id = id,
    name = name,
    parts = parts.sortedBy { it.catalogPart.id }.map {
        val part = it.catalogPart
        BuildPartResponse(part.id, part.category, part.name, part.price, part.createdAt, it.quantity)
    },
    createdAt = createdAt,
)

data class BuildPartResponse(
    @get:JsonProperty("part_id") val partId: UUID,
    val category: String,
    val name: String,
    val price: BigDecimal?,
    @get:JsonProperty("created_at") val createdAt: Instant,
    val quantity: Int,
)
