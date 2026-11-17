package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.jpa.repository.Lock
import org.springframework.data.jpa.repository.Query
import org.springframework.data.repository.query.Param
import jakarta.persistence.LockModeType
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>, JpaSpecificationExecutor<CatalogPart> {
    /** Serializes administrative deletion against inserts of build selections referencing the part. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select part from CatalogPart part where part.id = :id")
    fun findByIdForUpdate(@Param("id") id: UUID): CatalogPart?
}
