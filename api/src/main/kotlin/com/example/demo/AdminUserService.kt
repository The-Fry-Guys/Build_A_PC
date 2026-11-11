package com.example.demo

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/** Reads paginated user profiles without exposing identity records or persistence entities. */
@Service
class AdminUserService(private val users: UserRepository) {
    /** Searches the full user directory and maps only the documented profile fields. */
    @Transactional(readOnly = true)
    fun listUsers(q: String?, page: Int, size: Int): AdminUserPage {
        val pageable = directoryPage(page, size)
        val result = if (q.isNullOrBlank()) users.findAll(pageable)
        else users.findAll(directorySearch(q, "email", "displayName"), pageable)
        return AdminUserPage(result.content.map { AuthUserResponse.from(it) }, page, size, result.totalElements, result.totalPages)
    }
}

/** Carries approved account profiles and the shared pagination metadata. */
data class AdminUserPage(
    val content: List<AuthUserResponse>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Int,
)
