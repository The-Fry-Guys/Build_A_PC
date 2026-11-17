package com.example.demo

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.validation.constraints.NotBlank
import jakarta.validation.constraints.Pattern

/** Google web code-exchange input defined by OpenAPI. */
class GoogleLoginRequest(
    @field:NotBlank(message = "Authorization code is required.")
    val code: String,

    @param:JsonProperty("code_verifier")
    @field:Pattern(
        regexp = "[A-Za-z0-9._~-]{43,128}",
        message = "PKCE verifier must contain 43–128 valid characters.",
    )
    val codeVerifier: String,

    @param:JsonProperty("redirect_uri")
    @field:NotBlank(message = "Redirect URI is required.")
    val redirectUri: String,
)
