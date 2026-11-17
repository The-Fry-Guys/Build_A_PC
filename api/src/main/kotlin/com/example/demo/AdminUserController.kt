package com.example.demo

import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PutMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.ResponseStatus
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpStatus
import org.springframework.security.core.Authentication
import java.util.UUID

/** Exposes user directory and account maintenance behind the database-backed admin gate. */
@RestController
@RequestMapping("/api/v1/admin/users", produces = [MediaType.APPLICATION_JSON_VALUE])
class AdminUserController(private val service: AdminUserService) {
    /** Returns a bounded, non-cacheable page of matching account profiles. */
    @GetMapping
    fun getUsers(
        @RequestParam(required = false) q: String?,
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): ResponseEntity<AdminUserPage> = ResponseEntity.ok()
        .cacheControl(CacheControl.noStore())
        .body(service.listUsers(q, page, size))

    /** Updates only the user's email and display name; role is never accepted from the request. */
    @PutMapping("/{id}")
    fun updateUser(@PathVariable id: UUID, @RequestBody request: AdminUserUpdateRequest): AuthUserResponse =
        service.updateUser(id, request)

    /** Removes an account unless it is the account making this request. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    fun deleteUser(authentication: Authentication, @PathVariable id: UUID) =
        service.deleteUser(id, authentication.principalUserId())
}

private fun Authentication.principalUserId(): UUID = try {
    UUID.fromString(name)
} catch (_: IllegalArgumentException) {
    throw org.springframework.web.server.ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user ID is invalid.")
}
