package com.example.demo

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant
import java.util.UUID

/** Application roles stored as text in the users table. */
enum class UserRole {
    USER,
    ADMIN,
}

/** An application account, independent of its login provider. */
@Entity
@Table(name = "users", schema = "public")
class User(
    @field:Column(nullable = false, unique = true, columnDefinition = "text")
    var email: String,

    @field:Column(name = "display_name", columnDefinition = "text")
    var displayName: String? = null,

    @field:Enumerated(EnumType.STRING)
    @field:Column(nullable = false, columnDefinition = "text")
    var role: UserRole = UserRole.USER,

    @field:Column(name = "created_at", nullable = false, updatable = false)
    var createdAt: Instant = Instant.now(),

    @field:Id
    @field:GeneratedValue(strategy = GenerationType.UUID)
    var id: UUID? = null,
)
