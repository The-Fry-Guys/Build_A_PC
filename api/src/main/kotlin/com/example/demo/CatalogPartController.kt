package com.example.demo

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.PathVariable
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.http.MediaType
import java.math.BigDecimal
import java.util.UUID
import java.time.Instant

/** Exposes database-backed catalog listing and part lookup routes. */
@RestController
@RequestMapping("/api/v1/parts", produces = [MediaType.APPLICATION_JSON_VALUE])
class CatalogPartController(private val repository: CatalogPartRepository) {
    /** Returns a validated, bounded page of catalog parts sorted by ID. */
    @GetMapping
    fun getParts(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @RequestParam(required = false) q: String? = null,
    ): CatalogPartPage {
        // Bound the SQL query and use a unique sort key so pages are deterministic.
        val pageable = directoryPage(page, size)
        val parts = if (q.isNullOrBlank()) repository.findAll(pageable)
        else repository.findAll(directorySearch(q, "name", "category"), pageable)

        return CatalogPartPage(
            content = parts.content.map { it.toResponse() },
            page = page,
            size = size,
            totalElements = parts.totalElements,
            totalPages = parts.totalPages,
        )
    }

    /** Returns the requested catalog part or reports a missing resource. */
    @GetMapping("/{id}")
    fun getPart(@PathVariable id: UUID): PartResponse =
        repository.findById(id).orElseThrow { ResourceNotFoundException() }.toResponse()
}

/** Carries catalog results with page indexes and collection totals. */
data class CatalogPartPage(
    val content: List<PartResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

/** Represents a catalog part using the field names defined by OpenAPI. */
data class PartResponse(
    @get:JsonProperty("part_id") val partId: UUID,
    val category: String,
    val name: String,
    val price: BigDecimal?,
    @get:JsonProperty("created_at") val createdAt: Instant,
)

/** Maps a persisted catalog part to its public API representation. */
private fun CatalogPart.toResponse() = PartResponse(id, category, name, price, createdAt)
