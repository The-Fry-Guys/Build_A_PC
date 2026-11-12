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
    /** Builds stateless authentication and checks current database roles for privileged requests. */
    @Bean
    fun securityFilterChain(
        http: HttpSecurity,
        objectMapper: ObjectMapper,
        jwtDecoder: JwtDecoder,
        users: UserRepository,
        @Qualifier("appCorsConfigurationSource")
        cors: CorsConfigurationSource,
    ): SecurityFilterChain {
        val admin = DatabaseAdminAuthorization(users)
        val unauthorized = authenticationEntryPoint(objectMapper)
        val forbidden = accessDeniedHandler(objectMapper)

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

                it.requestMatchers("/api/v1/admin/**").access(admin)

                // Future catalog mutations require an administrator.
                it.requestMatchers("/api/v1/parts", "/api/v1/parts/**").access(admin)

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

    /** Returns sanitized authentication errors with the required bearer challenge. */
    private fun authenticationEntryPoint(objectMapper: ObjectMapper): AuthenticationEntryPoint =
        AuthenticationEntryPoint { request, response, _ ->
            response.setHeader("WWW-Authenticate", "Bearer")
            writeProblemDetail(
                HttpStatus.UNAUTHORIZED,
                "Authentication is required to access this resource.",
                request,
                response,
                objectMapper,
            )
        }

    /** Returns sanitized forbidden errors without revealing permission data. */
    private fun accessDeniedHandler(objectMapper: ObjectMapper): AccessDeniedHandler =
        AccessDeniedHandler { request, response, _ ->
            writeProblemDetail(
                HttpStatus.FORBIDDEN,
                "You are not allowed to access this resource.",
                request,
                response,
                objectMapper,
            )
        }

    /** Maps the app token's role claims to Spring Security authorities. */
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
