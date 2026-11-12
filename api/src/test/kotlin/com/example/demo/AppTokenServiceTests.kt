package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.EnumSource
import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwtException
import java.time.Duration
import java.time.Instant
import java.util.Base64
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull

/** Tests real JWT signing and validation using public fixture keys. */
class AppTokenServiceTests {
    private val properties = AppJwtProperties(
        issuer = "https://buildapc.test",
        secretBase64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
    )

    private val configuration = AppJwtConfiguration()
    private val key = configuration.appJwtKey(properties)
    private val encoder = configuration.appJwtEncoder(key)
    private val decoder = configuration.appJwtDecoder(key, properties)
    private val service = AppTokenService(encoder, properties)

    @ParameterizedTest
    @EnumSource(UserRole::class)
    fun `issued token contains user claims and default lifetime`(role: UserRole) {
        val user = User(
            email = "user@example.com",
            role = role,
            id = UUID.randomUUID(),
        )

        val token = service.issueFor(user)
        val decoded = decoder.decode(token)

        assertEquals("HS256", decoded.headers["alg"])
        assertEquals(user.id.toString(), decoded.subject)
        assertEquals(properties.issuer, decoded.issuer.toString())
        assertEquals(user.email, decoded.getClaimAsString("email"))
        assertEquals(listOf(role.name), decoded.getClaimAsStringList("roles"))

        val issuedAt = assertNotNull(decoded.issuedAt)
        val expiresAt = assertNotNull(decoded.expiresAt)
        assertEquals(Duration.ofHours(1), Duration.between(issuedAt, expiresAt))
    }

    @Test
    fun `token lifetime follows configuration`() {
        val shortLifetime = AppJwtProperties(
            issuer = properties.issuer,
            secretBase64 = properties.secretBase64,
            ttl = Duration.ofMinutes(15),
        )
        val shortService = AppTokenService(encoder, shortLifetime)

        val decoded = decoder.decode(
            shortService.issueFor(
                User(email = "user@example.com", id = UUID.randomUUID()),
            ),
        )

        assertEquals(
            Duration.ofMinutes(15),
            Duration.between(
                assertNotNull(decoded.issuedAt),
                assertNotNull(decoded.expiresAt),
            ),
        )
    }

    @Test
    fun `tokens signed with another key are rejected`() {
        val otherProperties = AppJwtProperties(
            issuer = properties.issuer,
            secretBase64 = Base64.getEncoder().encodeToString(
                ByteArray(32) { 42.toByte() },
            ),
        )
        val otherEncoder = configuration.appJwtEncoder(
            configuration.appJwtKey(otherProperties),
        )
        val token = signedToken(signingEncoder = otherEncoder)

        assertThrows<JwtException> { decoder.decode(token) }
    }

    @Test
    fun `tokens with the wrong issuer are rejected`() {
        val token = signedToken(issuer = "https://another-api.test")

        assertThrows<JwtException> { decoder.decode(token) }
    }

    @Test
    fun `expired tokens are rejected`() {
        // Exceed Spring's default 60-second clock-skew allowance.
        val token = signedToken(expiresAt = Instant.now().minusSeconds(120))

        assertThrows<JwtException> { decoder.decode(token) }
    }

    @Test
    fun `users without an assigned ID cannot receive tokens`() {
        assertThrows<IllegalStateException> {
            service.issueFor(User(email = "user@example.com"))
        }
    }

    private fun signedToken(
        signingEncoder: JwtEncoder = encoder,
        issuer: String = properties.issuer,
        expiresAt: Instant = Instant.now().plusSeconds(3600),
    ): String {
        val claims = JwtClaimsSet.builder()
            .issuer(issuer)
            .subject(UUID.randomUUID().toString())
            .issuedAt(expiresAt.minusSeconds(3600))
            .expiresAt(expiresAt)
            .build()

        return signingEncoder.encode(
            JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                claims,
            ),
        ).tokenValue
    }
}
