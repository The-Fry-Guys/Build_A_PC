package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Provides catalog persistence, UUID lookup, and database pagination through JPA. */
interface CatalogPartRepository : JpaRepository<CatalogPart, UUID>
