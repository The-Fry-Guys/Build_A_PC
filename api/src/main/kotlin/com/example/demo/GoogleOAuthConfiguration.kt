package com.example.demo

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

/** Registers Google settings and its provider HTTP client. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GoogleOAuthProperties::class)
class GoogleOAuthConfiguration {
    /** Bounds network calls and prevents credential-bearing redirects. */
    @Bean
    fun googleRestClient(builder: RestClient.Builder): RestClient {
        val transport = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build()

        val factory = JdkClientHttpRequestFactory(transport)
        factory.setReadTimeout(Duration.ofSeconds(10))

        return builder
            .requestFactory(factory)
            .build()
    }
}
