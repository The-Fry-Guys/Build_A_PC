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

/** Connects Google web verification, accounts, and app-token issuance. */
@RestController
@RequestMapping(
    "/api/v1/auth",
    produces = [MediaType.APPLICATION_JSON_VALUE],
)
class GoogleAuthController(
    private val google: GoogleIdentityClient,
    private val accounts: AccountService,
    private val tokens: AppTokenService,
) {
    /** Exchanges a Google authorization code for an application session. */
    @PostMapping(
        "/google",
        consumes = [MediaType.APPLICATION_JSON_VALUE],
    )
    fun login(
        @Valid @RequestBody request: GoogleLoginRequest,
    ): ResponseEntity<GoogleLoginResponse> {
        val identity = google.exchange(
            code = request.code,
            codeVerifier = request.codeVerifier,
            redirectUri = request.redirectUri,
        )

        val user = accounts.findOrCreate(identity)

        return ResponseEntity.ok()
            .cacheControl(CacheControl.noStore())
            .header(HttpHeaders.PRAGMA, "no-cache")
            .body(
                GoogleLoginResponse(
                    token = tokens.issueFor(user),
                    user = AuthUserResponse.from(user),
                ),
            )
    }
}
