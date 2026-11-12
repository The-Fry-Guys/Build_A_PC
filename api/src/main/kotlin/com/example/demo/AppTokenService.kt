package com.example.demo

import org.springframework.security.oauth2.jose.jws.MacAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoder
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.stereotype.Service
import java.time.Instant

/** Issues app tokens after account identity has been verified. */
@Service
class AppTokenService(
    private val encoder: JwtEncoder,
    private val properties: AppJwtProperties,
) {
    /** Creates a signed token for an already-persisted application user. */
    fun issueFor(user: User): String {
        val userId = checkNotNull(user.id) {
            "Tokens can only be issued for persisted users."
        }
        val now = Instant.now()

        val claims = JwtClaimsSet.builder()
            .issuer(properties.issuer)
            .subject(userId.toString())
            .issuedAt(now)
            .expiresAt(now.plus(properties.ttl))
            .claim("email", user.email)
            .claim("roles", listOf(user.role.name))
            .build()

        val header = JwsHeader.with(MacAlgorithm.HS256).build()

        return encoder.encode(
            JwtEncoderParameters.from(header, claims),
        ).tokenValue
    }
}
