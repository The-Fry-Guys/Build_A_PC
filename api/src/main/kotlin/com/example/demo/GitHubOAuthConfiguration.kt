package com.example.demo

import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.http.client.JdkClientHttpRequestFactory
import org.springframework.web.client.RestClient
import java.net.http.HttpClient
import java.time.Duration

private const val CONNECT_TIMEOUT_SECONDS = 5L
private const val READ_TIMEOUT_SECONDS = 10L

/** Enables GitHub settings and the provider HTTP client. */
@Configuration(proxyBeanMethods = false)
@EnableConfigurationProperties(GitHubOAuthProperties::class)
class GitHubOAuthConfiguration {
    /** Uses finite timeouts and does not follow redirects with credentials. */
    @Bean
    fun githubRestClient(builder: RestClient.Builder): RestClient {
        val transport = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(CONNECT_TIMEOUT_SECONDS))
            .followRedirects(HttpClient.Redirect.NEVER)
            .build()

        val factory = JdkClientHttpRequestFactory(transport)
        factory.setReadTimeout(Duration.ofSeconds(READ_TIMEOUT_SECONDS))

        return builder
            .requestFactory(factory)
            .defaultHeader("User-Agent", "Build-A-PC")
            .build()
    }
}
