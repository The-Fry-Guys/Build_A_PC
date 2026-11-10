package com.example.demo

import org.springframework.web.bind.annotation.*
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import java.time.Instant

@RestController
@RequestMapping("/api/v1/builds", produces = ["application/json"])
class PCBuildController(
    private val buildRepository: PcBuildRepository,
    private val partRepository: CatalogPartRepository
) {
    @GetMapping
    fun getMyBuilds(@AuthenticationPrincipal jwt: Jwt): List<BuildResponse> {
        val userId = jwt.subject ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "INVALID TOKEN")
        return buildRepository.findAllByUserId(userId).map { it.toBuildResponse() }
    }

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

data class CreateBuildRequest(
    val name: String,
    val partIds: List<UUID>
)

data class BuildResponse(
    val id: UUID,
    val name: String,
    val parts: List<PartResponse>,
    val createdAt: Instant
)

private fun PCBuild.toBuildResponse() = BuildResponse(
    id = id,
    name = name,
    parts = parts.map { PartResponse(it.id, it.category, it.name, it.price, it.createdAt) },
    createdAt = createdAt
)