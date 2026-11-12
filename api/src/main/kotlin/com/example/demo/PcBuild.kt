package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

@Entity
@Table(name = "pc_builds")
class PcBuild(
    @Id
    val id: UUID = UUID.randomUUID(),
    @Column(name = "user_id", nullable = false)
    val userId: UUID,
    @Column(nullable = false)
    val name: String,
    @Column(name = "created_at", nullable = false)
    val createdAt: Instant = Instant.now(),
)
