package com.example.demo

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator
import org.springframework.security.oauth2.jwt.BadJwtException
import org.springframework.security.oauth2.jwt.JwtClaimValidator
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.stereotype.Service
import org.springframework.web.server.ResponseStatusException

/** Verifies Google identities before they reach account persistence. */
@Service
class GoogleIdentityVerifier internal constructor(
    private val properties: GoogleOAuthProperties,
    private val decoder: NimbusJwtDecoder,
) {
    /** Production uses Google's published signing keys without adding a decoder bean. */
    @Autowired
    constructor(properties: GoogleOAuthProperties) : this(
        properties,
        NimbusJwtDecoder
            .withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs")
            .build(),
    )

    init {
        val issuer = JwtClaimValidator<String>("iss") {
            it == "https://accounts.google.com" ||
                it == "accounts.google.com"
        }

        val audience = JwtClaimValidator<List<String>>("aud") {
            it != null && it.contains(properties.webClientId)
        }

        decoder.setJwtValidator(
            DelegatingOAuth2TokenValidator(
                JwtValidators.createDefault(),
                issuer,
                audience,
            ),
        )
    }

    /** Returns trusted account information without retaining Google's token. */
    fun verify(idToken: String): ProviderIdentity {
        if (properties.webClientId.isBlank()) {
            throw ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Google sign-in is not configured.",
            )
        }

        if (idToken.isBlank()) {
            throw invalidToken()
        }

        val jwt = try {
            decoder.decode(idToken)
        } catch (_: BadJwtException) {
            throw invalidToken()
        } catch (_: JwtException) {
            throw ResponseStatusException(
                HttpStatus.BAD_GATEWAY,
                "Google sign-in could not be verified. Try again later.",
            )
        }

        val subject = jwt.subject?.takeIf { it.isNotBlank() }
            ?: throw invalidToken()

        val email = jwt.getClaimAsString("email")
            ?.takeIf { it.isNotBlank() }
            ?: throw invalidToken()

        // Timestamp validation checks expiration; also require its presence.
        if (jwt.expiresAt == null) {
            throw invalidToken()
        }

        if (jwt.claims["email_verified"] != true) {
            throw EmailNotVerifiedException()
        }

        return ProviderIdentity(
            provider = AuthProvider.GOOGLE,
            providerUserId = subject,
            email = email,
            emailVerified = true,
            displayName = jwt.getClaimAsString("name"),
        )
    }

    private fun invalidToken() = ResponseStatusException(
        HttpStatus.BAD_REQUEST,
        "Google rejected the identity token. Sign in again.",
    )
}
