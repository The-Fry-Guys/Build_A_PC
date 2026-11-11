package com.example.demo

import org.springframework.context.annotation.Profile
import org.springframework.http.CacheControl
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

/** Issues real app tokens for seeded local fixtures only when the isolated e2e profile is active. */
@RestController
@Profile("e2e")
@RequestMapping("/api/v1/test")
class E2eAuthController(private val users: UserRepository, private val tokens: AppTokenService) {
    /** Looks up a seeded test identity without accepting a caller-selected role or creating accounts. */
    @PostMapping("/token")
    fun token(@RequestParam email: String): ResponseEntity<GitHubLoginResponse> {
        if (email !in setOf("e2e-admin@example.test", "e2e-user@example.test")) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND)
        }
        val user = users.findByEmail(email) ?: throw ResponseStatusException(HttpStatus.NOT_FOUND)
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(GitHubLoginResponse(tokens.issueFor(user), AuthUserResponse.from(user)))
    }
}
