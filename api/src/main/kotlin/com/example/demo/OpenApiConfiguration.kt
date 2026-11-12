package com.example.demo

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

/** Complements the handwritten contract with SpringDoc's implemented-route view. */
@Configuration(proxyBeanMethods = false)
class OpenApiConfiguration {
    /** Describes the implemented API and its application JWT authentication scheme. */
    @Bean
    fun implementedApi(): OpenAPI = OpenAPI()
        .info(
            Info()
                .title("Build A PC API")
                .version("1.0.0")
                .description("Generated implemented routes. The handwritten contract is at /openapi.yaml."),
        )
        .components(
            Components().addSecuritySchemes(
                "bearerAuth",
                SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("API-issued app JWT from /api/v1/auth/github."),
            ),
        )
}
