package com.example.demo

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`
import org.springframework.http.HttpMethod
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withException
import org.springframework.test.web.client.response.MockRestResponseCreators.withStatus
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.RestClient
import org.springframework.web.server.ResponseStatusException
import java.io.IOException
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertSame

/** Tests Google code exchange without contacting Google or a database. */
class GoogleIdentityClientTests {
    private val builder = RestClient.builder()
    private val server = MockRestServiceServer.bindTo(builder).build()
    private val verifier = mock(GoogleIdentityVerifier::class.java)

    private val callback = "http://localhost:8081/auth"
    private val pkce = "a".repeat(43)
    private val tokenUrl = "https://oauth2.googleapis.com/token"

    private fun client(
        clientId: String = "test-client",
        clientSecret: String = "test-secret",
        redirectUri: String = callback,
    ) = GoogleIdentityClient(
        GoogleOAuthProperties(clientId, clientSecret, redirectUri),
        verifier,
        builder.build(),
    )

    private fun exchange() =
        client().exchange("test-code", pkce, callback)

    @AfterEach
    fun verifyRequests() {
        server.verify()
    }

    @Test
    fun `successful exchange sends required fields and verifies the ID token`() {
        val expectedForm = LinkedMultiValueMap<String, String>().apply {
            add("grant_type", "authorization_code")
            add("client_id", "test-client")
            add("client_secret", "test-secret")
            add("code", "test-code")
            add("code_verifier", pkce)
            add("redirect_uri", callback)
        }

        server.expect(requestTo(tokenUrl))
            .andExpect(method(HttpMethod.POST))
            .andExpect(
                content().contentTypeCompatibleWith(
                    MediaType.APPLICATION_FORM_URLENCODED,
                ),
            )
            .andExpect(content().formData(expectedForm))
            .andRespond(
                withSuccess(
                    """{"id_token":"google-id-token","access_token":"unused"}""",
                    MediaType.APPLICATION_JSON,
                ),
            )

        val identity = ProviderIdentity(
            provider = AuthProvider.GOOGLE,
            providerUserId = "google-user-123",
            email = "member@example.com",
            emailVerified = true,
        )
        `when`(verifier.verify("google-id-token")).thenReturn(identity)

        assertSame(identity, exchange())
        verify(verifier).verify("google-id-token")
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "code",
            "short-verifier",
            "long-verifier",
            "invalid-verifier",
            "callback",
        ],
    )
    fun `invalid input is rejected before contacting Google`(invalid: String) {
        val suppliedVerifier = when (invalid) {
            "short-verifier" -> "short"
            "long-verifier" -> "a".repeat(129)
            "invalid-verifier" -> "!".repeat(43)
            else -> pkce
        }

        // No HTTP expectations: an outgoing request would fail this test.
        val error = assertThrows<ResponseStatusException> {
            client().exchange(
                code = if (invalid == "code") " " else "test-code",
                codeVerifier = suppliedVerifier,
                redirectUri = if (invalid == "callback") {
                    "https://unknown.example/auth"
                } else {
                    callback
                },
            )
        }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        verifyNoInteractions(verifier)
    }

    @ParameterizedTest
    @ValueSource(strings = ["client-id", "client-secret", "callback"])
    fun `missing configuration returns service unavailable`(missing: String) {
        val configuredClient = client(
            clientId = if (missing == "client-id") "" else "test-client",
            clientSecret = if (missing == "client-secret") "" else "test-secret",
            redirectUri = if (missing == "callback") "" else callback,
        )

        val error = assertThrows<ResponseStatusException> {
            configuredClient.exchange("test-code", pkce, callback)
        }

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.statusCode)
        verifyNoInteractions(verifier)
    }

    @Test
    fun `rejected authorization code returns bad request`() {
        server.expect(requestTo(tokenUrl))
            .andRespond(
                withStatus(HttpStatus.BAD_REQUEST)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("""{"error":"invalid_grant"}"""),
            )

        val error = assertThrows<ResponseStatusException> { exchange() }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        assertEquals(
            "Google rejected the authorization code. Sign in again.",
            error.reason,
        )
        verifyNoInteractions(verifier)
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "{}",
            "",
            "{not-valid-json",
            """{"id_token":""}""",
            """{"error":"unexpected_error"}""",
        ],
    )
    fun `unusable responses return sanitized bad gateway`(body: String) {
        server.expect(requestTo(tokenUrl))
            .andRespond(withSuccess(body, MediaType.APPLICATION_JSON))

        assertProviderFailure()
    }

    @ParameterizedTest
    @ValueSource(ints = [400, 401, 429, 500])
    fun `other provider errors return sanitized bad gateway`(status: Int) {
        server.expect(requestTo(tokenUrl))
            .andRespond(
                withStatus(HttpStatus.valueOf(status))
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(
                        """{"error":"invalid_client","error_description":"private"}""",
                    ),
            )

        assertProviderFailure()
    }

    @Test
    fun `network failures return sanitized bad gateway`() {
        server.expect(requestTo(tokenUrl))
            .andRespond(withException(IOException("private network details")))

        assertProviderFailure()
    }

    @Test
    fun `email verification failure is preserved`() {
        server.expect(requestTo(tokenUrl))
            .andRespond(
                withSuccess(
                    """{"id_token":"google-id-token"}""",
                    MediaType.APPLICATION_JSON,
                ),
            )

        `when`(verifier.verify("google-id-token"))
            .thenThrow(EmailNotVerifiedException())

        assertThrows<EmailNotVerifiedException> { exchange() }
    }

    private fun assertProviderFailure() {
        val error = assertThrows<ResponseStatusException> { exchange() }

        assertEquals(HttpStatus.BAD_GATEWAY, error.statusCode)
        assertEquals(
            "Google sign-in could not be completed. Try again later.",
            error.reason,
        )
        assertNull(error.cause)
        verifyNoInteractions(verifier)
    }
}
