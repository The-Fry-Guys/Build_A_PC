package com.example.demo

import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.RSASSASigner
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.springframework.http.HttpStatus
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.web.server.ResponseStatusException
import java.time.Instant
import java.util.Date
import kotlin.test.assertEquals

/** Exercises real Google-style JWT verification using temporary RSA keys. */
class GoogleIdentityVerifierTests {
    private val key = RSAKeyGenerator(2048).generate()
    private val clientId = "test-client.apps.googleusercontent.com"

    private fun verifier(configuredClientId: String = clientId) =
        GoogleIdentityVerifier(
            GoogleOAuthProperties(webClientId = configuredClientId),
            NimbusJwtDecoder.withPublicKey(key.toRSAPublicKey()).build(),
        )

    @ParameterizedTest
    @ValueSource(strings = ["https://accounts.google.com", "accounts.google.com"])
    fun `valid tokens produce a trusted Google identity`(issuer: String) {
        val identity = verifier().verify(token { issuer(issuer) })

        assertEquals(AuthProvider.GOOGLE, identity.provider)
        assertEquals("google-user-123", identity.providerUserId)
        assertEquals("member@example.com", identity.email)
        assertEquals(true, identity.emailVerified)
        assertEquals("Test Member", identity.displayName)
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "issuer", "audience", "expiration", "subject", "email",
            "missing-expiration", "signature", "malformed",
        ],
    )
    fun `invalid tokens are rejected`(problem: String) {
        val invalid = when (problem) {
            "issuer" -> token { issuer("https://another-provider.test") }
            "audience" -> token { audience("another-client") }
            // Exceeds Spring's default clock-skew allowance.
            "expiration" -> token {
                expirationTime(Date.from(Instant.now().minusSeconds(120)))
            }
            "subject" -> token { subject(null) }
            "email" -> token { claim("email", null) }
            "missing-expiration" -> token { expirationTime(null) }
            "signature" -> token(signingKey = RSAKeyGenerator(2048).generate())
            else -> "not-a-jwt"
        }

        val error = assertThrows<ResponseStatusException> {
            verifier().verify(invalid)
        }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        assertEquals("Google rejected the identity token. Sign in again.", error.reason)
    }

    @Test
    fun `unverified email is rejected`() {
        assertThrows<EmailNotVerifiedException> {
            verifier().verify(token { claim("email_verified", false) })
        }
    }

    @Test
    fun `missing email verification is rejected`() {
        assertThrows<EmailNotVerifiedException> {
            verifier().verify(token { claim("email_verified", null) })
        }
    }

    @Test
    fun `missing client configuration returns service unavailable`() {
        val error = assertThrows<ResponseStatusException> {
            verifier(configuredClientId = "").verify(token())
        }

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, error.statusCode)
    }

    @Test
    fun `blank token is rejected`() {
        val error = assertThrows<ResponseStatusException> {
            verifier().verify(" ")
        }

        assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
    }

    private fun token(
        signingKey: RSAKey = key,
        change: JWTClaimsSet.Builder.() -> Unit = {},
    ): String {
        val now = Instant.now()
        val claims = JWTClaimsSet.Builder()
            .issuer("https://accounts.google.com")
            .audience(clientId)
            .subject("google-user-123")
            .issueTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(3600)))
            .claim("email", "member@example.com")
            .claim("email_verified", true)
            .claim("name", "Test Member")
            .apply(change)
            .build()

        return SignedJWT(JWSHeader.Builder(JWSAlgorithm.RS256).build(), claims)
            .apply { sign(RSASSASigner(signingKey)) }
            .serialize()
    }
}
