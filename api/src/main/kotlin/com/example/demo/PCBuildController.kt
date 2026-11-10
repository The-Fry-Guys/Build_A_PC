package com.example.demo

import org.springframework.web.bind.annotation.*
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import java.time.Instant

/* Exposes database-backed routes for users to create and manage their PC builds.
 * This controller acts as an OAuth2 Resource Server by extracting the user ID directly from the injected JWT.
 * It supports the core product goals of allowing a user to construct a pc and view all their pc builds. */
@RestController
@RequestMapping("/api/v1/builds", produces = ["application/json"])
class PCBuildController(
    private val buildRepository: PcBuildRepository,
    private val partRepository: CatalogPartRepository
) {
    /* Returns all builds belonging to the currently authenticated user. */
    @GetMapping
    fun getMyBuilds(@AuthenticationPrincipal jwt: Jwt): List<BuildResponse> {
        val userId = jwt.subject ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID TOKEN")
        return buildRepository.findAllByUserId(userId).map { it.toBuildResponse() }
    }

    /* Creates a new build from a list of catalog part UUIDs. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    fun createBuild(
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: CreateBuildRequest
    ): BuildResponse {
        val userId = jwt.subject ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val parts = partRepository.findAllById(request.partIds)
        if (parts.size != request.partIds.size) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "ONE OR MORE PARTS NOT FOUND")
        }

        val build = PCBuild(
            userId = userId,
            name = request.name,
            parts = parts.toMutableList()
        )

        return buildRepository.save(build).toBuildResponse()
    }

    /* Deletes a build, enforcing that a user can only delete their own resources. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteBuild(
        @AuthenticationPrincipal jwt: Jwt,
        @PathVariable id: UUID
    ) {
        val userId = jwt.subject ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED)
        val build = buildRepository.findById(id).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "BUILD NOT FOUND")
        }

        if (build.userId != userId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "YOU DON'T HAVE PERMISSION")
        }
        buildRepository.delete(build)
    }
}

/* DTO for incoming build creation requests. */
data class CreateBuildRequest(
    val name: String,
    val partIds: List<UUID>
)

/* DTO for outgoing build data to the client. */
data class BuildResponse(
    val id: UUID,
    val name: String,
    val parts: List<PartResponse>,
    val createdAt: Instant
)

/* Extension function mapping the database entity to its public API representation. */
private fun PCBuild.toBuildResponse() = BuildResponse(
    id = id,
    name = name,
    parts = parts.map { PartResponse(it.id, it.category, it.name, it.price, it.createdAt) },
    createdAt = createdAt
)