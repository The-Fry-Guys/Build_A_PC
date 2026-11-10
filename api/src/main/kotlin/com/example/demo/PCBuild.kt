package com.example.demo

import jakarta.persistence.*
import java.util.UUID
import java.time.Instant

/* Maps a user's saved PC build to the pc_builds database table. */
@Entity
@Table(name = "pc_builds")
class PCBuild(
    @Id
    val id: UUID = UUID.randomUUID(),

    @Column(name = "user_id", nullable = false)
    val userId: String = "",

    @Column(nullable = false)
    val name: String = "",

    @ManyToMany
    @JoinTable(
        name = "pc_build_parts",
        joinColumns = [JoinColumn(name = "build_id")],
        inverseJoinColumns = [JoinColumn(name = "part_id")]
    )

    val parts: MutableList<CatalogPart> = mutableListOf(),

    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now()
)