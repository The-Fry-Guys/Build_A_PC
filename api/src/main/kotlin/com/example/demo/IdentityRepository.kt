package com.example.demo

import org.springframework.data.jpa.repository.EntityGraph
import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Reads and persists provider identities. */
interface IdentityRepository : JpaRepository<Identity, UUID> {
    /** Finds a provider account and loads its associated user. */
    @EntityGraph(attributePaths = ["user"])
    fun findByProviderAndProviderUserId(
        provider: AuthProvider,
        providerUserId: String,
    ): Identity?

    /** Lists a user's identities to identify their existing login provider. */
    fun findAllByUserId(userId: UUID): List<Identity>
}
