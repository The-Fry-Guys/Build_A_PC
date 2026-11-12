package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.CascadeType
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.OneToMany
import jakarta.persistence.Table
import java.util.UUID
import java.time.Instant

/* Maps a user's saved PC build to the pc_builds database table. */
@Entity
@Table(name = "pc_builds")
class PCBuild(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: UUID,

    @Column(nullable = false)
    var name: String = "",

    @OneToMany(mappedBy = "build", cascade = [CascadeType.ALL], orphanRemoval = true)
    val parts: MutableList<BuildPart> = mutableListOf(),

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)

@Entity
@Table(name = "build_parts")
class BuildPart(
    @Id
    val id: UUID = UUID.randomUUID(),

    @ManyToOne(optional = false)
    @JoinColumn(name = "build_id", nullable = false)
    val build: PCBuild,

    @ManyToOne(optional = false)
    @JoinColumn(name = "catalog_part_id", nullable = false)
    val catalogPart: CatalogPart,

    @Column(nullable = false)
    var quantity: Int,
)