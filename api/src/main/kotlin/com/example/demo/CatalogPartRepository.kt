package com.example.demo

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.boot.data.autoconfigure.web.DataWebProperties
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>, JpaSpecificationExecutor<CatalogPart> {
    fun findByCategory(category: String, pageable: Pageable): Page<CatalogPart>
}


