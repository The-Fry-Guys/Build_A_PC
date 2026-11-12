package com.example.demo

import com.fasterxml.jackson.annotation.JsonProperty
import java.time.Instant
import java.util.UUID

/** Login result containing our app JWT, never GitHub's access token. */
class GitHubLoginResponse(
    val token: String,
    val user: AuthUserResponse,
)

/** Public account fields defined by our API contract. */
data class AuthUserResponse(
    val id: UUID,
    val email: String,
    @get:JsonProperty("display_name")
    val displayName: String?,
    val role: UserRole,
    @get:JsonProperty("created_at")
    val createdAt: Instant,
) {
    companion object {
        /** Copies approved fields without exposing a JPA entity. */
        fun from(user: User) = AuthUserResponse(
            id = checkNotNull(user.id),
            email = user.email,
            displayName = user.displayName,
            role = user.role,
            createdAt = user.createdAt,
        )
    }
}
