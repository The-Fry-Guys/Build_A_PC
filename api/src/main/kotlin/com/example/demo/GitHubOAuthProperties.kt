package com.example.demo

import org.springframework.boot.context.properties.ConfigurationProperties

/** Server-side GitHub OAuth settings for Expo web and Android. */
@ConfigurationProperties(prefix = "app.oauth.github")
class GitHubOAuthProperties(
    val web: Client = Client(),
    val android: Client = Client(),
) {
    /** Credentials and the exact callback registered for one OAuth App. */
    class Client(
        val clientId: String = "",
        val clientSecret: String = "",
        val redirectUri: String = "",
    )
}
