package com.example.demo

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.UUID

/** Reads paginated user profiles without exposing identity records or persistence entities. */
@Service
class AdminUserService(private val users: UserRepository) {
    /** Searches the full user directory and maps only the documented profile fields. */
    @Transactional(readOnly = true)
    fun listUsers(q: String?, page: Int, size: Int): AdminUserPage {
        val pageable = directoryPage(page, size)
        val result = if (q.isNullOrBlank()) users.findAll(pageable)
        else users.findAll(directorySearch(q, "email", "displayName"), pageable)
        return AdminUserPage(
            result.content.map { AuthUserResponse.from(it) }, page, size, result.totalElements, result.totalPages,
        )
    }

    /** Updates documented profile fields while preserving role and creation time. */
    @Transactional
    fun updateUser(id: UUID, request: AdminUserUpdateRequest): AuthUserResponse {
        val email = request.email.trim()
        val displayName = request.displayName?.trim()?.ifEmpty { null }
        if (!EMAIL_PATTERN.matches(email) || email.length > 254 || displayName?.length.orZero() > 255) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Email or display name is invalid.")
        }
        val user = users.findById(id).orElseThrow { ResourceNotFoundException() }
        val existing = users.findByEmail(email)
        if (existing != null && existing.id != id) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "That email address is already in use.")
        }
        user.email = email
        user.displayName = displayName
        return AuthUserResponse.from(users.saveAndFlush(user))
    }

    /** Deletes a user only when it is not the currently authenticated administrator. */
    @Transactional
    fun deleteUser(id: UUID, currentUserId: UUID) {
        if (id == currentUserId) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "You cannot delete the currently authenticated account.")
        }
        val user = users.findById(id).orElseThrow { ResourceNotFoundException() }
        users.delete(user)
    }

    private fun Int?.orZero() = this ?: 0

    private companion object {
        val EMAIL_PATTERN = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")
    }
}

/** Explicit writable user fields; role, ID, and timestamps are intentionally excluded. */
data class AdminUserUpdateRequest(val email: String, val displayName: String? = null)

/** Carries approved account profiles and the shared pagination metadata. */
data class AdminUserPage(
    val content: List<AuthUserResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)
