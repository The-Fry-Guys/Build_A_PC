package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>, JpaSpecificationExecutor<CatalogPart>
