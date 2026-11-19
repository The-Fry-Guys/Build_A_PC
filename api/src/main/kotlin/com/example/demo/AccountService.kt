package com.example.demo

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/** Finds existing accounts or creates accounts from verified provider identities. */
@Service
class AccountService(
    private val users: UserRepository,
    private val identities: IdentityRepository,
    private val pcBuildRepository: PCBuildRepository
) {
    /** Applies the required identity and email rules in one database transaction. */
    @Transactional
    fun findOrCreate(identity: ProviderIdentity): User {
        // A known provider account already identifies its application user.
        val existingIdentity = identities.findByProviderAndProviderUserId(
            identity.provider,
            identity.providerUserId,
        )

        if (existingIdentity != null) {
            return existingIdentity.user
        }

        // New identities must have a provider-verified email.
        if (!identity.emailVerified) {
            throw EmailNotVerifiedException()
        }

        // Do not automatically link a new identity to an existing email.
        val existingUser = users.findByEmail(identity.email)

        if (existingUser != null) {
            val existingProvider = identities.findAllByUserId(
                checkNotNull(existingUser.id),
            ).firstOrNull()?.provider

            checkNotNull(existingProvider) {
                "An existing account has no provider identity."
            }

            throw ProviderConflictException(existingProvider)
        }

        val user = users.saveAndFlush(
            User(
                email = identity.email,
                displayName = identity.displayName,
            ),
        )

        identities.saveAndFlush(
            Identity(
                user = user,
                provider = identity.provider,
                providerUserId = identity.providerUserId,
            ),
        )

        return user
    }

    /* Updates the user's personal information */
    @Transactional
    fun updateProfile(userId: UUID, request: ProfileUpdateRequest): User {
        val user = users.findById(userId)
            .orElseThrow { ResponseStatusException(HttpStatus.NOT_FOUND, "USER NOT FOUND") }

        user.displayName = request.displayName
        return users.save(user)
    }

    /* Deletes the user's account and purges all associated data. */
    @Transactional
    fun deleteAccount(userId: UUID) {
        val userIdentities = identities.findAllByUserId(userId)
        identities.deleteAll(userIdentities)
        pcBuildRepository.deleteByUserId(userId)
        users.deleteById(userId)
    }
}
