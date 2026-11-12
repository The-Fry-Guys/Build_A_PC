package com.example.demo

import com.nimbusds.jose.jwk.source.ImmutableSecret
import com.nimbusds.jose.proc.SecurityContext
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtValidators
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import java.util.Base64
import javax.crypto.SecretKey
import javax.crypto.spec.SecretKeySpec

/** Creates the signing and verification components for our API tokens. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AppJwtProperties::class)
class AppJwtConfiguration {
    /** Requires a configured Base64 secret containing at least 32 random bytes. */
    @Bean
    fun appJwtKey(properties: AppJwtProperties): SecretKey {
        val bytes = try {
            Base64.getDecoder().decode(properties.secretBase64)
        } catch (_: IllegalArgumentException) {
            throw IllegalStateException(
                "APP_JWT_SECRET_BASE64 must contain valid Base64.",
            )
        }

        check(bytes.size >= 32) {
            "APP_JWT_SECRET_BASE64 must decode to at least 32 bytes."
        }

        return SecretKeySpec(bytes, "HmacSHA256")
    }

    /** Signs JWTs using our server-held key. */
    @Bean
    fun appJwtEncoder(appJwtKey: SecretKey): JwtEncoder =
        NimbusJwtEncoder(ImmutableSecret<SecurityContext>(appJwtKey))

    /** Verifies signatures, issuer, and token timestamps. */
    @Bean
    fun appJwtDecoder(
        appJwtKey: SecretKey,
        properties: AppJwtProperties,
    ): JwtDecoder {
        val decoder = NimbusJwtDecoder.withSecretKey(appJwtKey)
            .macAlgorithm(MacAlgorithm.HS256)
            .build()

        decoder.setJwtValidator(
            JwtValidators.createDefaultWithIssuer(properties.issuer),
        )

        return decoder
    }
}
