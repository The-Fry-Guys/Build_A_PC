package com.example.demo

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException

/** Selects server-owned credentials using an exact callback allowlist. */
@Component
class GitHubClientResolver(
    private val properties: GitHubOAuthProperties,
) {
    /** Rejects unknown callbacks and invalid server configuration. */
    fun resolve(redirectUri: String): GitHubOAuthProperties.Client {
        val registrations = listOf(properties.web, properties.android)
            .filter { it.redirectUri.isNotBlank() }

        check(
            registrations.map { it.redirectUri }.distinct().size ==
                registrations.size,
        ) {
            "GitHub OAuth callbacks must be distinct."
        }

        val client = registrations.singleOrNull {
            it.redirectUri == redirectUri
        } ?: throw ResponseStatusException(
            HttpStatus.BAD_REQUEST,
            "The GitHub callback URI is not allowed.",
        )

        check(client.clientId.isNotBlank() && client.clientSecret.isNotBlank()) {
            "GitHub OAuth credentials are missing for the selected registration."
        }

        return client
    }
}
