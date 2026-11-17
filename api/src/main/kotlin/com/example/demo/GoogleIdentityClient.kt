package com.example.demo

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.stereotype.Service
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.client.RestClientResponseException
import org.springframework.web.server.ResponseStatusException

/** Exchanges Google web authorization codes for verified identities. */
@Service
class GoogleIdentityClient(
    private val properties: GoogleOAuthProperties,
    private val verifier: GoogleIdentityVerifier,
    @param:Qualifier("googleRestClient")
    private val http: RestClient,
) {
    /** Performs provider verification without creating application accounts. */
    fun exchange(
        code: String,
        codeVerifier: String,
        redirectUri: String,
    ): ProviderIdentity {
        if (listOf(
                properties.webClientId,
                properties.webClientSecret,
                properties.webRedirectUri,
            ).any { it.isBlank() }
        ) {
            throw ResponseStatusException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Google sign-in is not configured.",
            )
        }

        if (redirectUri != properties.webRedirectUri) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Google callback URL does not match the configured URL.",
            )
        }

        if (code.isBlank() || !VERIFIER_PATTERN.matches(codeVerifier)) {
            throw ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "A valid authorization code and PKCE verifier are required.",
            )
        }

        val form = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "authorization_code")
            add("client_id", properties.webClientId)
            add("client_secret", properties.webClientSecret)
            add("code", code)
            add("code_verifier", codeVerifier)
            add("redirect_uri", properties.webRedirectUri)
        }

        val response = try {
            http.post()
                .uri("https://oauth2.googleapis.com/token")
                .accept(MediaType.APPLICATION_JSON)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form)
                .retrieve()
                .body(GoogleTokenResponse::class.java)
                ?: throw providerFailure()
        } catch (error: RestClientResponseException) {
            val providerError = runCatching {
                error.getResponseBodyAs(GoogleTokenResponse::class.java)?.error
            }.getOrNull()

            if (
                error.statusCode == HttpStatus.BAD_REQUEST &&
                providerError == "invalid_grant"
            ) {
                throw ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Google rejected the authorization code. Sign in again.",
                )
            }

            throw providerFailure()
        } catch (_: RestClientException) {
            throw providerFailure()
        }

        if (response.error != null) {
            throw providerFailure()
        }

        val idToken = response.idToken?.takeIf { it.isNotBlank() }
            ?: throw providerFailure()

        return verifier.verify(idToken)
    }

    private fun providerFailure() = ResponseStatusException(
        HttpStatus.BAD_GATEWAY,
        "Google sign-in could not be completed. Try again later.",
    )

    private companion object {
        val VERIFIER_PATTERN = Regex("[A-Za-z0-9._~-]{43,128}")
    }
}
