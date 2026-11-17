package com.example.demo

import org.springframework.boot.context.properties.ConfigurationProperties

/** Server-owned settings for Google web authentication. */
@ConfigurationProperties(prefix = "app.oauth.google")
class GoogleOAuthProperties(
    val webClientId: String = "",
    val webClientSecret: String = "",
    val webRedirectUri: String = "",
)