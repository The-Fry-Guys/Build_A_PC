package com.example.demo

import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Tests account decisions using the actual PostgreSQL schema. */
@SpringBootTest
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
@Transactional
class AccountServiceTests {
    @Autowired
    private lateinit var service: AccountService

    @Autowired
    private lateinit var users: UserRepository

    @Autowired
    private lateinit var identities: IdentityRepository

    @Autowired
    private lateinit var entityManager: EntityManager

    private fun newIdentity() = ProviderIdentity(
        provider = AuthProvider.GITHUB,
        providerUserId = UUID.randomUUID().toString(),
        email = "${UUID.randomUUID()}@example.com",
        emailVerified = true,
        displayName = "Test User",
    )

    @Test
    fun `new verified identity creates a user and identity`() {
        val input = newIdentity()
        val result = service.findOrCreate(input)
        val userId = assertNotNull(result.id)

        entityManager.clear()

        val storedUser = assertNotNull(users.findByEmail(input.email))
        assertEquals(userId, storedUser.id)
        assertEquals(input.displayName, storedUser.displayName)
        assertEquals(UserRole.USER, storedUser.role)

        val storedIdentity = assertNotNull(
            identities.findByProviderAndProviderUserId(
                input.provider,
                input.providerUserId,
            ),
        )
        assertEquals(userId, storedIdentity.user.id)
        assertEquals(1, identities.findAllByUser_Id(userId).size)
    }

    @Test
    fun `known identity returns its user before checking email`() {
        val input = newIdentity()
        val original = service.findOrCreate(input)
        val userCount = users.count()
        val identityCount = identities.count()

        entityManager.clear()

        val result = service.findOrCreate(
            input.copy(
                email = "changed-${input.email}",
                emailVerified = false,
                displayName = "Changed Name",
            ),
        )

        assertEquals(original.id, result.id)
        assertEquals(input.email, result.email)
        assertEquals(input.displayName, result.displayName)
        assertEquals(userCount, users.count())
        assertEquals(identityCount, identities.count())
    }

    @Test
    fun `new unverified identity is rejected without saving records`() {
        val input = newIdentity().copy(emailVerified = false)
        val userCount = users.count()
        val identityCount = identities.count()

        assertThrows<EmailNotVerifiedException> {
            service.findOrCreate(input)
        }

        assertEquals(userCount, users.count())
        assertEquals(identityCount, identities.count())
        assertNull(users.findByEmail(input.email))
    }

    @Test
    fun `existing Google email rejects a new GitHub identity`() {
        val github = newIdentity()
        service.findOrCreate(
            github.copy(
                provider = AuthProvider.GOOGLE,
                providerUserId = UUID.randomUUID().toString(),
            ),
        )
        val userCount = users.count()
        val identityCount = identities.count()

        val error = assertThrows<ProviderConflictException> {
            service.findOrCreate(github)
        }

        assertEquals(AuthProvider.GOOGLE, error.existingProvider)
        assertTrue(error.message.orEmpty().contains("Google"))
        assertEquals(userCount, users.count())
        assertEquals(identityCount, identities.count())
        assertNull(
            identities.findByProviderAndProviderUserId(
                github.provider,
                github.providerUserId,
            ),
        )
    }
}
