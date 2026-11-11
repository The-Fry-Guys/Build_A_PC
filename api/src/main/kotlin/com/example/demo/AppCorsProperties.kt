package com.example.demo

import org.springframework.boot.context.properties.ConfigurationProperties

/** Explicit browser origins allowed to call the API. */
@ConfigurationProperties(prefix = "app.cors")
class AppCorsProperties(
    val allowedOrigins: List<String> = emptyList(),
) {
    init {
        require(allowedOrigins.none { it.isBlank() || it == "*" || it == "null" }) {
            "CORS origins must be explicit, nonblank origins."
        }
    }
}
