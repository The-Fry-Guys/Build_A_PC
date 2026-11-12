package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import java.util.UUID

/** Reads and persists application users. */
interface UserRepository : JpaRepository<User, UUID> {
    /** Returns the account registered with this email, if present. */
    fun findByEmail(email: String): User?
}
