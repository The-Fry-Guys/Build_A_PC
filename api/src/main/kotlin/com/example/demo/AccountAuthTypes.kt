package com.example.demo

/** Identity information verified by the API's provider integration, never a client request body. */
data class ProviderIdentity(
    val provider: AuthProvider,
    val providerUserId: String,
    val email: String,
    val emailVerified: Boolean,
    val displayName: String? = null,
)

/** A new provider identity cannot register with an unverified email. */
class EmailNotVerifiedException :
    RuntimeException("Verify your email at the provider before signing in.")

/** An email is already associated with an existing login provider. */
class ProviderConflictException(
    val existingProvider: AuthProvider,
) : RuntimeException(
    "This email is already registered with " +
        when (existingProvider) {
            AuthProvider.GITHUB -> "GitHub"
            AuthProvider.GOOGLE -> "Google"
        } +
        ". Sign in with that provider.",
)
