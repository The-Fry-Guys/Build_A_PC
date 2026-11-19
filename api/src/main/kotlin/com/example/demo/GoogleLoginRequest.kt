package com.example.demo

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.AssertTrue
import jakarta.validation.constraints.Pattern

/** Exactly one Google credential: a web code exchange or a native ID token. */
class GoogleLoginRequest(
    val code: String? = null,
    @param:JsonProperty("code_verifier")
    @field:Pattern(
        regexp = "[A-Za-z0-9._~-]{43,128}",
        message = "PKCE verifier must contain 43-128 valid characters.",
    )
    val codeVerifier: String? = null,
    @param:JsonProperty("redirect_uri")
    val redirectUri: String? = null,
    val idToken: String? = null,
) {
    @AssertTrue(message = "Provide either an ID token or a complete web code exchange, never both.")
    fun isAuthenticationValid(): Boolean = if (idToken != null) {
        idToken.isNotBlank() && code == null && codeVerifier == null && redirectUri == null
    } else {
        !code.isNullOrBlank() && !codeVerifier.isNullOrBlank() && !redirectUri.isNullOrBlank()
    }
}
