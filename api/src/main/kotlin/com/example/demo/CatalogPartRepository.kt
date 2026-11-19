package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import jakarta.persistence.LockModeType
import java.math.BigDecimal
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>, JpaSpecificationExecutor<CatalogPart> {
    /** Returns the smallest listed catalog price, ignoring parts without a price. */
    @Query("select min(part.price) from CatalogPart part")
    fun findMinimumPrice(): BigDecimal?

    /** Returns the largest listed catalog price, ignoring parts without a price. */
    @Query("select max(part.price) from CatalogPart part")
    fun findMaximumPrice(): BigDecimal?

    /** Returns catalog parts in a requested category using bounded pagination. */
    fun findByCategory(category: String, pageable: Pageable): Page<CatalogPart>

    /** Returns catalog parts ordered by how many units appear in saved builds. */
    @Query(
        value = """
            SELECT part.*
            FROM public.catalog_parts part
            LEFT JOIN public.build_parts selection ON selection.catalog_part_id = part.id
            GROUP BY part.id
            ORDER BY COALESCE(SUM(selection.quantity), 0) DESC, part.id ASC
        """,
        countQuery = "SELECT COUNT(*) FROM public.catalog_parts",
        nativeQuery = true,
    )
    fun findMostUsed(pageable: Pageable): Page<CatalogPart>

    /** Serializes administrative deletion against inserts of build selections referencing the part. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select part from CatalogPart part where part.id = :id")
    fun findByIdForUpdate(@Param("id") id: UUID): CatalogPart?
}
