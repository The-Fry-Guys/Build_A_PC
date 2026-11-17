package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import jakarta.persistence.LockModeType
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>, JpaSpecificationExecutor<CatalogPart> {
    /** Returns catalog parts in a requested category using bounded pagination. */
    fun findByCategory(category: String, pageable: Pageable): Page<CatalogPart>

    /** Serializes administrative deletion against inserts of build selections referencing the part. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select part from CatalogPart part where part.id = :id")
    fun findByIdForUpdate(@Param("id") id: UUID): CatalogPart?
}
