package com.example.demo

import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter
import org.springframework.security.web.AuthenticationEntryPoint
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.access.AccessDeniedHandler
import org.springframework.web.cors.CorsConfigurationSource
import tools.jackson.databind.ObjectMapper

/** Defines public routes and validates app JWTs for private requests. */
@Configuration
@Import(AppCorsConfiguration::class)
class SecurityConfig {
    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        objectMapper: ObjectMapper,
        jwtDecoder: JwtDecoder,
        @Qualifier("appCorsConfigurationSource")
        cors: CorsConfigurationSource,
    ): SecurityFilterChain {
        val unauthorized = AuthenticationEntryPoint { request, response, _ ->
            response.setHeader("WWW-Authenticate", "Bearer")
            writeProblemDetail(
                HttpStatus.UNAUTHORIZED,
                "Authentication is required to access this resource.",
                request,
                response,
                objectMapper,
            )
        }

        val forbidden = AccessDeniedHandler { request, response, _ ->
            writeProblemDetail(
                HttpStatus.FORBIDDEN,
                "You are not allowed to access this resource.",
                request,
                response,
                objectMapper,
            )
        }

        http
            .cors { it.configurationSource(cors) }
            .csrf { it.disable() }
            .sessionManagement {
                it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            }
            .exceptionHandling {
                it.authenticationEntryPoint(unauthorized)
                it.accessDeniedHandler(forbidden)
            }
            .authorizeHttpRequests {
                it.requestMatchers(
                    "/api/v1",
                    "/api/v1/",
                    "/api/v1/health",
                    "/actuator/health",
                    "/v3/api-docs/**",
                    "/openapi.yaml",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                ).permitAll()

                it.requestMatchers(HttpMethod.POST, "/api/v1/auth/github").permitAll()

                it.requestMatchers(
                    HttpMethod.GET,
                    "/api/v1/parts",
                    "/api/v1/parts/**",
                ).permitAll()

                it.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")

                // Future catalog mutations require an administrator.
                it.requestMatchers("/api/v1/parts", "/api/v1/parts/**").hasRole("ADMIN")

                it.requestMatchers(
                    "/api/v1/me",
                    "/api/v1/users/**",
                    "/api/v1/builds/**",
                ).authenticated()

                // Preserve existing 404/405 responses outside private namespaces.
                it.anyRequest().permitAll()
            }
            .oauth2ResourceServer {
                it.jwt { jwt ->
                    jwt.decoder(jwtDecoder)
                    jwt.jwtAuthenticationConverter(roleConverter())
                }
                it.authenticationEntryPoint(unauthorized)
                it.accessDeniedHandler(forbidden)
            }

        return http.build()
    }

    private fun roleConverter(): JwtAuthenticationConverter {
        val authorities = JwtGrantedAuthoritiesConverter().apply {
            setAuthoritiesClaimName("roles")
            setAuthorityPrefix("ROLE_")
        }

        return JwtAuthenticationConverter().apply {
            setJwtGrantedAuthoritiesConverter(authorities)
        }
    }
}
