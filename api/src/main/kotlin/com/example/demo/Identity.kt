package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.time.Instant
import java.util.UUID

/** Supported login providers, stored as text. */
enum class AuthProvider {
    GITHUB,
    GOOGLE,
}

/** A provider account associated with an application user. */
@Entity
@Table(
    name = "identities",
    schema = "public",
    uniqueConstraints = [
        UniqueConstraint(
            name = "identities_provider_provider_user_id_key",
            columnNames = ["provider", "provider_user_id"],
        ),
    ],
)
class Identity(
    @field:ManyToOne(fetch = FetchType.LAZY, optional = false)
    @field:JoinColumn(name = "user_id", nullable = false)
    var user: User,

    @field:Enumerated(EnumType.STRING)
    @field:Column(nullable = false, columnDefinition = "text")
    var provider: AuthProvider,

    @field:Column(name = "provider_user_id", nullable = false, columnDefinition = "text")
    var providerUserId: String,

    @field:Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @field:Id
    @field:GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
)
