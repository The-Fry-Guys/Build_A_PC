package com.example.demo

import org.springframework.http.CacheControl
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** Exposes the read-only user directory behind the database-backed admin gate. */
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
}
