package com.example.demo

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** Finds existing accounts or creates accounts from verified provider identities. */
@Service
class AccountService(
    private val users: UserRepository,
    private val identities: IdentityRepository,
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
}
