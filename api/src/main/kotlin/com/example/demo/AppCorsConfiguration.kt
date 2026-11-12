package com.example.demo

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.UrlBasedCorsConfigurationSource

private const val PREFLIGHT_CACHE_SECONDS = 3600L

/** Defines cross-origin browser access independently of authentication. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(AppCorsProperties::class)
class AppCorsConfiguration {
    /** Allows configured origins and Bearer/JSON headers without cross-origin cookies. */
    @Bean
    fun appCorsConfigurationSource(
        properties: AppCorsProperties,
    ): UrlBasedCorsConfigurationSource {
        val configuration = CorsConfiguration().apply {
            allowedOrigins = properties.allowedOrigins
            allowedMethods = listOf(
                "GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS",
            )
            allowedHeaders = listOf("Authorization", "Content-Type")
            allowCredentials = false
            maxAge = PREFLIGHT_CACHE_SECONDS
        }

        return UrlBasedCorsConfigurationSource().apply {
            registerCorsConfiguration("/**", configuration)
        }
    }
}
