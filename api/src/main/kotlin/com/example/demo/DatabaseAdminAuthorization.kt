package com.example.demo

import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.security.authorization.AuthorizationDecision
import org.springframework.security.authorization.AuthorizationManager
import org.springframework.security.core.Authentication
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.web.access.intercept.RequestAuthorizationContext
import java.util.UUID
import java.util.function.Supplier

/** Uses a verified token's subject to check current permissions without trusting stale role claims. */
class DatabaseAdminAuthorization(
    private val users: UserRepository,
) : AuthorizationManager<RequestAuthorizationContext> {
    /** Denies access unless a validated JWT identifies an existing administrator right now. */
    override fun authorize(
        authentication: Supplier<out Authentication?>,
        context: RequestAuthorizationContext,
    ): AuthorizationDecision {
        val principal = authentication.get() as? JwtAuthenticationToken
        val id = principal?.takeIf { it.isAuthenticated }?.let {
            runCatching { UUID.fromString(it.token.subject) }.getOrNull()
        }
        return AuthorizationDecision(id != null && isCurrentAdmin(id))
    }

    /** Reads the current role and denies access when database permissions cannot be verified. */
    private fun isCurrentAdmin(id: UUID): Boolean =
        try {
            users.findById(id).orElse(null)?.role == UserRole.ADMIN
        } catch (_: DataAccessException) {
            LoggerFactory.getLogger(javaClass).warn(
                "Admin access denied because current database permissions could not be verified",
            )
            false
        }
}
