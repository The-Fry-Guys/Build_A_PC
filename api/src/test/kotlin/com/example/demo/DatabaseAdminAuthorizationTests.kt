package com.example.demo

import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.dao.DataAccessResourceFailureException
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.security.authentication.AnonymousAuthenticationToken
import org.springframework.security.core.Authentication
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken
import org.springframework.security.web.access.intercept.RequestAuthorizationContext
import java.util.Optional
import java.util.UUID
import java.util.function.Supplier
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** Checks current database permissions, stale token claims, and fail-closed rejection paths. */
class DatabaseAdminAuthorizationTests {
    private val users = mock(UserRepository::class.java)
    private val gate = DatabaseAdminAuthorization(users)
    private val context = RequestAuthorizationContext(MockHttpServletRequest())
    private val id = UUID.randomUUID()

    /** Builds an authenticated token with deliberately stale role claims. */
    private fun principal(subject: String = id.toString()): JwtAuthenticationToken = JwtAuthenticationToken(
        Jwt.withTokenValue("fixture").header("alg", "HS256").subject(subject).claim("roles", listOf("ADMIN")).build(),
        listOf(SimpleGrantedAuthority("ROLE_ADMIN")),
    )

    /** Demotion must apply to an already-authenticated token on its next request. */
    @Test
    fun `revocation immediately overrides an admin JWT`() {
        val account = User(email = "admin@example.test", role = UserRole.ADMIN, id = id)
        `when`(users.findById(id)).thenReturn(Optional.of(account))
        val authentication = Supplier<Authentication> { principal() }
        assertTrue(gate.authorize(authentication, context).isGranted)
        account.role = UserRole.USER
        assertFalse(gate.authorize(authentication, context).isGranted)
    }

    /** Deleted accounts cannot retain permission through signed role claims. */
    @Test
    fun `missing accounts are denied`() {
        `when`(users.findById(id)).thenReturn(Optional.empty())
        assertFalse(gate.authorize(Supplier { principal() }, context).isGranted)
    }

    /** Non-JWT callers and malformed subjects never reach the repository. */
    @Test
    fun `anonymous and malformed subjects are rejected`() {
        val anonymous = AnonymousAuthenticationToken("fixture", "anonymous", listOf(SimpleGrantedAuthority("ROLE_ANONYMOUS")))
        assertFalse(gate.authorize(Supplier { anonymous }, context).isGranted)
        assertFalse(gate.authorize(Supplier { principal("invalid-id") }, context).isGranted)
        verifyNoInteractions(users)
    }

    /** Unavailable permission data must never allow a privileged operation. */
    @Test
    fun `database failure denies access`() {
        `when`(users.findById(id)).thenThrow(DataAccessResourceFailureException("private details"))
        assertFalse(gate.authorize(Supplier { principal() }, context).isGranted)
    }
}
