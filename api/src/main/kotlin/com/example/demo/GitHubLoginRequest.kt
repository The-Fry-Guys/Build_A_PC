package com.example.demo

import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/** Authorization-code exchange input supplied by Expo. */
class GitHubLoginRequest(
    @field:NotBlank(message = "Authorization code is required.")
    val code: String,

    @field:Pattern(
        regexp = "[A-Za-z0-9._~-]{43,128}",
        message = "PKCE verifier must contain 43–128 valid characters.",
    )
    val codeVerifier: String,

    @field:NotBlank(message = "Redirect URI is required.")
    val redirectUri: String,
)
