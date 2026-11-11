package com.example.demo

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.server.ResponseStatusException

/** Exchanges GitHub authorization codes for verified identity information. */
@Service
class GitHubIdentityClient(
    private val resolver: GitHubClientResolver,
    @param:Qualifier("githubRestClient")
    private val http: RestClient,
) {
    /** Performs provider calls only; account persistence happens afterward. */
    fun exchange(
        code: String,
        codeVerifier: String,
        redirectUri: String,
    ): ProviderIdentity {
        val client = resolver.resolve(redirectUri)

        if (code.isBlank() || !VERIFIER_PATTERN.matches(codeVerifier)) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A valid authorization code and PKCE verifier are required.",
            )
        }

        try {
            val form = LinkedMultiValueMap<String, String>().apply {
                add("client_id", client.clientId)
                add("client_secret", client.clientSecret)
                add("code", code)
                add("code_verifier", codeVerifier)
                add("redirect_uri", redirectUri)
            }

            val tokenResponse = http.post()
                .uri(TOKEN_URL)
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(GitHubTokenResponse::class.java)
                ?: throw providerFailure()

            // GitHub can return an OAuth error in a successful HTTP response.
            when (tokenResponse.error) {
                null -> Unit
                "bad_verification_code" -> throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "GitHub rejected the authorization code. Try signing in again.",
                )
                "unverified_user_email" -> throw EmailNotVerifiedException()
                else -> throw providerFailure()
            }

            val accessToken = tokenResponse.accessToken
                ?.takeIf { it.isNotBlank() }
                ?: throw providerFailure()

            val user = http.get()
                .uri(USER_URL)
                .accept(MediaType.APPLICATION_JSON)
                .headers { it.setBearerAuth(accessToken) }
                .retrieve()
                .body(GitHubUserResponse::class.java)
                ?: throw providerFailure()

            val emails = http.get()
                .uri(EMAILS_URL)
                .accept(MediaType.APPLICATION_JSON)
                .headers { it.setBearerAuth(accessToken) }
                .retrieve()
                .body(Array<GitHubEmailResponse>::class.java)
                ?: throw providerFailure()

            val userId = user.id?.takeIf { it > 0 }
                ?: throw providerFailure()

            val primaryEmail = emails.firstOrNull {
                it.primary && it.verified && !it.email.isNullOrBlank()
            } ?: throw EmailNotVerifiedException()

            return ProviderIdentity(
                provider = AuthProvider.GITHUB,
                providerUserId = userId.toString(),
                email = checkNotNull(primaryEmail.email),
                emailVerified = true,
                displayName = user.name?.takeIf { it.isNotBlank() }
                    ?: user.login,
            )
        } catch (_: RestClientException) {
            // Do not expose provider response bodies, tokens, or secrets.
            throw providerFailure()
        }
    }

    private fun providerFailure() = ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "GitHub sign-in could not be completed. Try again later.",
    )

    private companion object {
        const val TOKEN_URL = "https://github.com/login/oauth/access_token"
        const val USER_URL = "https://api.github.com/user"
        const val EMAILS_URL = "https://api.github.com/user/emails"

        val VERIFIER_PATTERN = Regex("[A-Za-z0-9._~-]{43,128}")
    }
}
