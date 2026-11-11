package com.example.demo

import jakarta.validation.Valid
import org.springframework.http.CacheControl
import org.springframework.http.HttpHeaders
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** Connects GitHub verification, account persistence, and app-token issuance. */
@RestController
@RequestMapping(
    "/api/v1/auth",
    produces = [MediaType.APPLICATION_JSON_VALUE],
)
class GitHubAuthController(
    private val github: GitHubIdentityClient,
    private val accounts: AccountService,
    private val tokens: AppTokenService,
) {
    /** Exchanges an authorization code for an app JWT and public user details. */
    @PostMapping(
        "/github",
        consumes = [MediaType.APPLICATION_JSON_VALUE],
    )
    fun login(
        @Valid @RequestBody request: GitHubLoginRequest,
    ): ResponseEntity<GitHubLoginResponse> {
        val identity = github.exchange(
            code = request.code,
            codeVerifier = request.codeVerifier,
            redirectUri = request.redirectUri,
        )

        val user = accounts.findOrCreate(identity)

        val response = GitHubLoginResponse(
            token = tokens.issueFor(user),
            user = AuthUserResponse.from(user),
        )

        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .body(response)
    }
}
