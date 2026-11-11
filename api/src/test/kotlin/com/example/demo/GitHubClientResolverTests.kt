package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import kotlin.test.assertEquals
import kotlin.test.assertSame

/** Tests callback selection without Spring, GitHub, or a database. */
class GitHubClientResolverTests {
    private val web = GitHubOAuthProperties.Client(
        clientId = "web-id",
        clientSecret = "fake-web-secret",
        redirectUri = "http://localhost:8081/auth",
    )

    private val android = GitHubOAuthProperties.Client(
        clientId = "android-id",
        clientSecret = "fake-android-secret",
        redirectUri = "client://auth",
    )

    private val resolver = GitHubClientResolver(
        GitHubOAuthProperties(web = web, android = android),
    )

    @Test
    fun `selects web credentials`() {
        assertSame(web, resolver.resolve(web.redirectUri))
    }

    @Test
    fun `selects Android credentials`() {
        assertSame(android, resolver.resolve(android.redirectUri))
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "",
            "https://unknown.example/auth",
            "http://localhost:8081/auth/",
            " http://localhost:8081/auth",
        ],
    )
    fun `rejects callbacks outside the exact allowlist`(uri: String) {
        val error = assertThrows<ResponseStatusException> {
            resolver.resolve(uri)
        }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
    }

    @Test
    fun `rejects duplicate configured callbacks`() {
        val invalid = GitHubClientResolver(
            GitHubOAuthProperties(web = web, android = web),
        )

        assertThrows<IllegalStateException> {
            invalid.resolve(web.redirectUri)
        }
    }

    @ParameterizedTest
    @ValueSource(strings = ["id", "secret"])
    fun `rejects missing selected credentials`(missing: String) {
        val incomplete = GitHubOAuthProperties.Client(
            clientId = if (missing == "id") "" else "web-id",
            clientSecret = if (missing == "secret") "" else "fake-secret",
            redirectUri = web.redirectUri,
        )

        val invalid = GitHubClientResolver(
            GitHubOAuthProperties(web = incomplete, android = android),
        )

        assertThrows<IllegalStateException> {
            invalid.resolve(web.redirectUri)
        }
    }
}
