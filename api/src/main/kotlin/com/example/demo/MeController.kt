package com.example.demo

import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/** Returns the application account identified by a validated app JWT. */
@RestController
@RequestMapping(
    "/api/v1/me",
    produces = [MediaType.APPLICATION_JSON_VALUE],
)
class MeController(
    private val users: UserRepository,
) {
    /** Loads current profile data rather than trusting copied profile claims. */
    @GetMapping
    fun me(
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<AuthUserResponse> {
        val subject = jwt.subject ?: throw unavailableAccount()

        val userId = try {
            UUID.fromString(subject)
        } catch (_: IllegalArgumentException) {
            throw unavailableAccount()
        }

        val user = users.findById(userId)
            .orElseThrow { unavailableAccount() }

        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(AuthUserResponse.from(user))
    }

    private fun unavailableAccount() = ResponseStatusException(
        HttpStatus.UNAUTHORIZED,
        "The signed-in account is unavailable. Sign in again.",
    )
}
