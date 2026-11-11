package com.example.demo

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import java.util.UUID

/** Reads and persists application users. */
interface UserRepository : JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    /** Returns the account registered with this email, if present. */
    fun findByEmail(email: String): User?
}
