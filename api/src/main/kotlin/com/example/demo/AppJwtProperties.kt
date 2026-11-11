package com.example.demo

import org.springframework.boot.context.properties.ConfigurationProperties
import java.time.Duration

/** Settings for JWTs issued by this API. */
@ConfigurationProperties(prefix = "app.jwt")
class AppJwtProperties(
    val issuer: String = "",
    val secretBase64: String = "",
    val ttl: Duration = Duration.ofHours(1),
) {
    init {
        require(issuer.isNotBlank()) {
            "The app JWT issuer must be configured."
        }
        require(ttl >= Duration.ofSeconds(1)) {
            "The app JWT lifetime must be at least one second."
        }
    }
}
