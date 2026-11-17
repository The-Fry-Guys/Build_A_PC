package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.util.UUID
import java.time.Instant

/** Maps a general catalog part to the catalog_parts database table. */
@Entity
@Table(name = "catalog_parts")
class CatalogPart(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false)
    var category: String = "",
    @Column(nullable = false)
    var name: String = "",
    @Column(precision = 10, scale = 2)
    var price: BigDecimal? = null,
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
)
