package com.example.demo

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.ResponseStatus
import com.fasterxml.jackson.annotation.JsonProperty
import org.springframework.http.MediaType
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import org.springframework.data.jpa.domain.Specification
import jakarta.persistence.criteria.Predicate
import java.math.BigDecimal
import java.util.UUID
import java.time.Instant

/** Exposes database-backed catalog listing and part lookup routes. */
@RestController
@RequestMapping("/api/v1/parts", produces = [MediaType.APPLICATION_JSON_VALUE])
class CatalogPartController(
    private val repository: CatalogPartRepository,
    private val jdbc: JdbcTemplate,
) {
    /** Returns a bounded page of popular parts or filtered catalog results. */
    @GetMapping
    fun getParts(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
        @RequestParam(required = false) q: String? = null,
        @RequestParam(required = false) category: String? = null,
        @RequestParam(required = false) minPrice: BigDecimal? = null,
        @RequestParam(required = false) maxPrice: BigDecimal? = null,
    ): CatalogPartPage {
        // Validate the requested page before using either catalog query.
        val pageable = directoryPage(page, size)
        validatePriceRange(minPrice, maxPrice)
        val search = q?.takeIf { it.isNotBlank() }
            ?.let { directorySearch<CatalogPart>(it, "name", "category") }
        val selectedCategory = category?.takeIf { it.isNotBlank() }
        val categoryFilter = selectedCategory?.let { selected ->
            Specification<CatalogPart> { root, _, builder -> builder.equal(root.get<String>("category"), selected) }
        }
        val priceFilter = if (minPrice == null && maxPrice == null) null else Specification<CatalogPart> { root, _, builder ->
            val price = root.get<BigDecimal>("price")
            val predicates = mutableListOf<Predicate>(builder.isNotNull(price))
            minPrice?.let { predicates.add(builder.greaterThanOrEqualTo(price, it)) }
            maxPrice?.let { predicates.add(builder.lessThanOrEqualTo(price, it)) }
            builder.and(*predicates.toTypedArray())
        }
        val filters = listOfNotNull(search, categoryFilter, priceFilter)
        val parts = when {
            search == null && selectedCategory == null && priceFilter == null -> repository.findMostUsed(pageable)
            search == null && selectedCategory != null && priceFilter == null -> repository.findByCategory(selectedCategory, pageable)
            else -> repository.findAll(filters.reduce { current, next -> current.and(next) }, pageable)
        }

        return CatalogPartPage(
            content = parts.content.map { it.toResponse() },
            page = page,
            size = size,
            totalElements = parts.totalElements,
            totalPages = parts.totalPages,
        )
    }

    /** Returns the global listed-price bounds used to scale the catalog range slider. */
    @GetMapping("/price-range")
    fun getPriceRange(): CatalogPriceRange = CatalogPriceRange(
        minPrice = repository.findMinimumPrice(),
        maxPrice = repository.findMaximumPrice(),
    )

    /** Returns the requested catalog part or reports a missing resource. */
    @GetMapping("/{id}")
    fun getPart(@PathVariable id: UUID): PartResponse =
        repository.findById(id).orElseThrow { ResourceNotFoundException() }.toResponse()

    /** Adds a catalog part through an administrator-only route. */
    @PostMapping(consumes = [MediaType.APPLICATION_JSON_VALUE])
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    fun createPart(@RequestBody request: CatalogPartWriteRequest): PartResponse =
        repository.saveAndFlush(request.toEntity()).toResponse()

    /** Replaces editable catalog fields while retaining the stable ID and creation time. */
    @PutMapping("/{id}", consumes = [MediaType.APPLICATION_JSON_VALUE])
    @Transactional
    fun updatePart(@PathVariable id: UUID, @RequestBody request: CatalogPartWriteRequest): PartResponse {
        val part = repository.findById(id).orElseThrow { ResourceNotFoundException() }
        val validated = request.toEntity()
        if (part.category != validated.category && hasCategoryDetails(part.id)) {
            throw ResponseStatusException(
                HttpStatus.CONFLICT,
                "A part with category-specific details cannot be moved to another category.",
            )
        }
        part.category = validated.category
        part.name = validated.name
        part.price = validated.price
        return repository.saveAndFlush(part).toResponse()
    }

    /** Refuses to remove a part that is selected by a saved build. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    fun deletePart(@PathVariable id: UUID) {
        val part = repository.findByIdForUpdate(id) ?: throw ResourceNotFoundException()
        val references = jdbc.queryForObject(
            "SELECT count(*) FROM public.build_parts WHERE catalog_part_id = ?",
            Long::class.java,
            id,
        ) ?: 0L
        if (references > 0) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "This part is selected by one or more saved builds.")
        }
        repository.delete(part)
    }

    /** Detects subtype data that would become inconsistent if the catalog category changed. */
    private fun hasCategoryDetails(id: UUID): Boolean = jdbc.queryForObject(
        """
            SELECT EXISTS (
                SELECT 1
                FROM (
                    SELECT part_id FROM public.case_accessory_details
                    UNION ALL SELECT part_id FROM public.case_details
                    UNION ALL SELECT part_id FROM public.case_fan_details
                    UNION ALL SELECT part_id FROM public.cpu_cooler_details
                    UNION ALL SELECT part_id FROM public.cpu_details
                    UNION ALL SELECT part_id FROM public.external_hard_drive_details
                    UNION ALL SELECT part_id FROM public.fan_controller_details
                    UNION ALL SELECT part_id FROM public.headphones_details
                    UNION ALL SELECT part_id FROM public.internal_hard_drive_details
                    UNION ALL SELECT part_id FROM public.keyboard_details
                    UNION ALL SELECT part_id FROM public.memory_details
                    UNION ALL SELECT part_id FROM public.monitor_details
                    UNION ALL SELECT part_id FROM public.motherboard_details
                    UNION ALL SELECT part_id FROM public.mouse_details
                    UNION ALL SELECT part_id FROM public.optical_drive_details
                    UNION ALL SELECT part_id FROM public.os_details
                    UNION ALL SELECT part_id FROM public.power_supply_details
                    UNION ALL SELECT part_id FROM public.sound_card_details
                    UNION ALL SELECT part_id FROM public.speakers_details
                    UNION ALL SELECT part_id FROM public.thermal_paste_details
                    UNION ALL SELECT part_id FROM public.ups_details
                    UNION ALL SELECT part_id FROM public.video_card_details
                    UNION ALL SELECT part_id FROM public.webcam_details
                    UNION ALL SELECT part_id FROM public.wired_network_card_details
                    UNION ALL SELECT part_id FROM public.wireless_network_card_details
                ) AS details
                WHERE details.part_id = ?
            )
        """.trimIndent(),
        Boolean::class.java,
        id,
    ) ?: false

    private fun CatalogPartWriteRequest.toEntity(): CatalogPart {
        val normalizedCategory = category.trim()
        val normalizedName = name.trim()
        if (normalizedCategory !in CATEGORIES || normalizedName.isBlank() || normalizedName.length > 255 ||
            price?.let { it.scale() > 2 || it.signum() < 0 || it > MAX_PRICE } == true
        ) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Category, name, or price is invalid.")
        }
        return CatalogPart(category = normalizedCategory, name = normalizedName, price = price)
    }

    /** Rejects negative, over-precision, over-maximum, or inverted catalog price bounds. */
    private fun validatePriceRange(minPrice: BigDecimal?, maxPrice: BigDecimal?) {
        val invalid = listOfNotNull(minPrice, maxPrice).any {
            it.signum() < 0 || it.scale().coerceAtLeast(0) > 2 || it > MAX_PRICE
        } || minPrice != null && maxPrice != null && minPrice > maxPrice
        if (invalid) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Price range is invalid.")
    }

    private companion object {
        val CATEGORIES = setOf(
            "case-accessory", "case-fan", "case", "cpu-cooler", "cpu", "external-hard-drive",
            "fan-controller", "headphones", "internal-hard-drive", "keyboard", "memory", "monitor",
            "motherboard", "mouse", "optical-drive", "os", "power-supply", "sound-card", "speakers",
            "thermal-paste", "ups", "video-card", "webcam", "wired-network-card", "wireless-network-card",
        )
        val MAX_PRICE = BigDecimal("99999999.99")
    }
}

/** Explicit writable catalog fields; IDs and timestamps are controlled by the server. */
data class CatalogPartWriteRequest(val category: String, val name: String, val price: BigDecimal? = null)

/** Carries catalog results with page indexes and collection totals. */
data class CatalogPartPage(
    val content: List<PartResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)

/** Carries the lowest and highest non-null prices in the public catalog. */
data class CatalogPriceRange(
    @get:JsonProperty("min_price") val minPrice: BigDecimal?,
    @get:JsonProperty("max_price") val maxPrice: BigDecimal?,
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
