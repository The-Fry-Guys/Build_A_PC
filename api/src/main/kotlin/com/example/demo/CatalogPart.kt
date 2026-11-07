package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.util.UUID

@Entity
@Table(name = "catalog_parts")
class CatalogPart(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(nullable = false)
    val category: String = "",
    @Column(nullable = false)
    val name: String = "",
    @Column(nullable = false, precision = 10, scale = 2)
    val price: BigDecimal = BigDecimal.ZERO,
)
