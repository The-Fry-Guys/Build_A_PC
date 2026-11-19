package com.example.demo

import io.swagger.v3.oas.annotations.Parameter
import io.swagger.v3.oas.annotations.security.SecurityRequirement
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.security.core.annotation.AuthenticationPrincipal
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/** Returns the application account identified by a validated app JWT. */
@RestController
@SecurityRequirement(name = "bearerAuth")
@RequestMapping(
    "/api/v1/me",
    produces = [MediaType.APPLICATION_JSON_VALUE],
)
class MeController(
    private val users: UserRepository,
    private val accountService: AccountService,
) {
    /** Loads current profile data rather than trusting copied profile claims. */
    @GetMapping
    fun me(
        @Parameter(hidden = true)
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<AuthUserResponse> {
        val user = getAuthenticatedUser(jwt)
        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .body(AuthUserResponse.from(user))
    }

    /** Updates the user's profile information. */
    @PutMapping(consumes = [MediaType.APPLICATION_JSON_VALUE])
    fun updateProfile(
        @Parameter(hidden = true)
        @AuthenticationPrincipal jwt: Jwt,
        @RequestBody request: ProfileUpdateRequest,
    ): ResponseEntity<AuthUserResponse> {
        val user = getAuthenticatedUser(jwt)
        val updatedUser = accountService.updateProfile(user.id!!, request)
        return ResponseEntity.ok().body(AuthUserResponse.from(updatedUser))
    }

    /** Deletes the user's account and all associated data. */
    @DeleteMapping
    fun deleteAccount(
        @Parameter(hidden = true)
        @AuthenticationPrincipal jwt: Jwt,
    ): ResponseEntity<Void> {
        val user = getAuthenticatedUser(jwt)
        accountService.deleteAccount(user.id!!)
        return ResponseEntity.noContent().build()
    }

    private fun getAuthenticatedUser(jwt: Jwt): User {
        val subject = jwt.subject ?: throw unavailableAccount()
        val userId = try {
            UUID.fromString(subject)
        } catch (_: IllegalArgumentException) {
            throw unavailableAccount()
        }
        return users.findById(userId).orElseThrow { unavailableAccount() }
    }

    private fun unavailableAccount() = ResponseStatusException(
        HttpStatus.UNAUTHORIZED,
        "The signed-in account is unavailable. Sign in again.",
    )
}

data class ProfileUpdateRequest(
    val displayName: String
)
