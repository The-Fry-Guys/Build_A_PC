package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.test.web.client.response.MockRestResponseCreators.withServerError
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Tests GitHub requests and identity extraction without external services. */
class GitHubIdentityClientTests {
    private val builder = RestClient.builder()

    // Bind before building the client so requests use simulated responses.
    private val server = MockRestServiceServer.bindTo(builder).build()

    private val redirectUri = "http://localhost:8081/auth"
    private val verifier = "a".repeat(43)

    private val resolver = GitHubClientResolver(
        GitHubOAuthProperties(
            web = GitHubOAuthProperties.Client(
                clientId = "fake-client-id",
                clientSecret = "fake-client-secret",
                redirectUri = redirectUri,
            ),
        ),
    )

    private val client = GitHubIdentityClient(resolver, builder.build())

    private fun expectJson(url: String, json: String) {
        server.expect(requestTo(url))
            .andRespond(withSuccess(json, MediaType.APPLICATION_JSON))
    }

    private fun expectToken() {
        expectJson(
            "https://github.com/login/oauth/access_token",
            """{"access_token":"fake-access-token"}""",
        )
    }

    private fun expectUser(
        json: String = """{"id":12345,"login":"test-user","name":"Test User"}""",
    ) {
        expectJson("https://api.github.com/user", json)
    }

    private fun exchange() = client.exchange(
        code = "fake-authorization-code",
        codeVerifier = verifier,
        redirectUri = redirectUri,
    )

    @Test
    fun `rejected authorization code returns bad request`() {
        expectJson(
            "https://github.com/login/oauth/access_token",
            """{"error":"bad_verification_code"}""",
        )

        val error = assertThrows<ResponseStatusException> { exchange() }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        server.verify()
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "[]",
            """[{"email":"user@example.com","primary":true,"verified":false}]""",
            """[{"email":"user@example.com","primary":false,"verified":true}]""",
        ],
    )
    fun `missing verified primary email is rejected`(emails: String) {
        expectToken()
        expectUser()
        expectJson("https://api.github.com/user/emails", emails)

        assertThrows<EmailNotVerifiedException> { exchange() }

        server.verify()
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "{}",
            "{not-valid-json",
            """{"access_token":""}""",
            """{"error":"incorrect_client_credentials"}""",
        ],
    )
    fun `unusable token response returns bad gateway`(json: String) {
        expectJson("https://github.com/login/oauth/access_token", json)

        val error = assertThrows<ResponseStatusException> { exchange() }

        assertEquals(HttpStatus.BAD_GATEWAY, error.statusCode)
        assertEquals(
            "GitHub sign-in could not be completed. Try again later.",
            error.reason,
        )
        assertNull(error.cause)
        server.verify()
    }

    @ParameterizedTest
    @ValueSource(strings = ["token", "user", "emails"])
    fun `provider HTTP failures return sanitized bad gateway`(stage: String) {
        if (stage != "token") {
            expectToken()
        }
        if (stage == "emails") {
            expectUser()
        }

        val url = when (stage) {
            "token" -> "https://github.com/login/oauth/access_token"
            "user" -> "https://api.github.com/user"
            else -> "https://api.github.com/user/emails"
        }

        server.expect(requestTo(url))
            .andRespond(withServerError().body("Private provider error information"))

        val error = assertThrows<ResponseStatusException> { exchange() }

        assertEquals(HttpStatus.BAD_GATEWAY, error.statusCode)
        assertEquals(
            "GitHub sign-in could not be completed. Try again later.",
            error.reason,
        )
        assertNull(error.cause)
        server.verify()
    }

    @ParameterizedTest
    @ValueSource(strings = ["code", "verifier", "callback"])
    fun `invalid input is rejected before contacting GitHub`(invalid: String) {
        // No server expectations: any outgoing request will fail the test.
        val error = assertThrows<ResponseStatusException> {
            client.exchange(
                code = if (invalid == "code") "" else "fake-code",
                codeVerifier = if (invalid == "verifier") "short" else verifier,
                redirectUri = if (invalid == "callback") {
                    "https://unknown.example/auth"
                } else {
                    redirectUri
                },
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        server.verify()
    }

    @Test
    fun `missing display name falls back to GitHub login`() {
        expectToken()
        expectUser("""{"id":12345,"login":"test-user","name":null}""")
        expectJson(
            "https://api.github.com/user/emails",
            """[{"email":"user@example.com","primary":true,"verified":true}]""",
        )

        assertEquals("test-user", exchange().displayName)
        server.verify()
    }

    @Test
    fun `exchanges code and returns verified primary identity`() {
        val expectedForm = LinkedMultiValueMap<String, String>().apply {
            add("client_id", "fake-client-id")
            add("client_secret", "fake-client-secret")
            add("code", "fake-authorization-code")
            add("code_verifier", verifier)
            add("redirect_uri", redirectUri)
        }

        server.expect(requestTo("https://github.com/login/oauth/access_token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header(HttpHeaders.ACCEPT, "application/json"))
            .andExpect(
                content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED),
            )
            .andExpect(content().formData(expectedForm))
            .andRespond(
                withSuccess(
                    """
                    {
                      "access_token": "fake-access-token",
                      "token_type": "bearer",
                      "scope": "read:user,user:email"
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON,
                ),
            )

        server.expect(requestTo("https://api.github.com/user"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-access-token"))
            .andRespond(
                withSuccess(
                    """
                    {
                      "id": 12345,
                      "login": "test-user",
                      "name": "Test User",
                      "unrelated_field": "ignored"
                    }
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON,
                ),
            )

        server.expect(requestTo("https://api.github.com/user/emails"))
            .andExpect(method(HttpMethod.GET))
            .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer fake-access-token"))
            .andRespond(
                withSuccess(
                    """
                    [
                      {
                        "email": "secondary@example.com",
                        "primary": false,
                        "verified": true
                      },
                      {
                        "email": "primary@example.com",
                        "primary": true,
                        "verified": true
                      }
                    ]
                    """.trimIndent(),
                    MediaType.APPLICATION_JSON,
                ),
            )

        val result = client.exchange(
            code = "fake-authorization-code",
            codeVerifier = verifier,
            redirectUri = redirectUri,
        )

        assertEquals(AuthProvider.GITHUB, result.provider)
        assertEquals("12345", result.providerUserId)
        assertEquals("primary@example.com", result.email)
        assertEquals("Test User", result.displayName)
        assertTrue(result.emailVerified)

        server.verify()
    }
}
