package com.example.demo

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.HttpStatus
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.web.SecurityFilterChain
import tools.jackson.databind.ObjectMapper

@Configuration
class SecurityConfig {
    @Bean
    fun securityFilterChain(http: HttpSecurity, objectMapper: ObjectMapper): SecurityFilterChain =
        http
            .csrf { it.disable() }
            .exceptionHandling { exceptions ->
                exceptions
                    .authenticationEntryPoint { request, response, _ ->
                        writeProblemDetail(
                            HttpStatus.UNAUTHORIZED,
                            "Authentication is required to access this resource.",
                            request,
                            response,
                            objectMapper,
                        )
                    }
                    .accessDeniedHandler { request, response, _ ->
                        writeProblemDetail(
                            HttpStatus.FORBIDDEN,
                            "You are not allowed to access this resource.",
                            request,
                            response,
                            objectMapper,
                        )
                    }
            }
            .authorizeHttpRequests { it.anyRequest().permitAll() }
            .build()
}
