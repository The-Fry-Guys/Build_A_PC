package com.example.demo

import jakarta.persistence.EntityManager
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.dao.DataIntegrityViolationException
import org.springframework.test.context.ActiveProfiles
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Exercises account mappings and constraints in the disposable Testcontainers Postgres. */
@SpringBootTest
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
@Transactional
class AccountRepositoryTests {
    @Autowired
    private lateinit var users: UserRepository

    @Autowired
    private lateinit var identities: IdentityRepository

    @Autowired
    private lateinit var entityManager: EntityManager

    @Test
    fun `saves and retrieves a user and GitHub identity`() {
        val email = "${UUID.randomUUID()}@example.com"
        val providerId = UUID.randomUUID().toString()
        val user = users.saveAndFlush(User(email = email, displayName = "Test User"))
        val userId = assertNotNull(user.id)
        val identity = identities.saveAndFlush(
            Identity(user = user, provider = AuthProvider.GITHUB, providerUserId = providerId),
        )
        val identityId = assertNotNull(identity.id)

        // Ensure lookups read persisted values, rather than cached Kotlin objects.
        entityManager.clear()

        val loadedUser = assertNotNull(users.findByEmail(email))
        assertEquals(userId, loadedUser.id)
        assertEquals("Test User", loadedUser.displayName)
        assertEquals(UserRole.USER, loadedUser.role)

        val loadedIdentity = assertNotNull(
            identities.findByProviderAndProviderUserId(AuthProvider.GITHUB, providerId),
        )
        assertEquals(identityId, loadedIdentity.id)
        assertEquals(userId, loadedIdentity.user.id)
        assertEquals(listOf(identityId), identities.findAllByUser_Id(userId).map { it.id })
    }

    @Test
    fun `rejects duplicate user emails`() {
        val email = "${UUID.randomUUID()}@example.com"
        users.saveAndFlush(User(email = email))

        val error = assertThrows<DataIntegrityViolationException> {
            users.saveAndFlush(User(email = email))
        }
        assertTrue(error.mostSpecificCause.message.orEmpty().contains("users_email_key"))
    }

    @Test
    fun `rejects a provider identity assigned to a second user`() {
        val firstUser = users.saveAndFlush(User(email = "${UUID.randomUUID()}@example.com"))
        val secondUser = users.saveAndFlush(User(email = "${UUID.randomUUID()}@example.com"))
        val providerId = UUID.randomUUID().toString()
        identities.saveAndFlush(
            Identity(user = firstUser, provider = AuthProvider.GITHUB, providerUserId = providerId),
        )

        val error = assertThrows<DataIntegrityViolationException> {
            identities.saveAndFlush(
                Identity(user = secondUser, provider = AuthProvider.GITHUB, providerUserId = providerId),
            )
        }
        assertTrue(
            error.mostSpecificCause.message.orEmpty()
                .contains("identities_provider_provider_user_id_key"),
        )
    }

    @Test
    fun `deleting a user cascades to their identities only`() {
        val removedUser = users.saveAndFlush(User(email = "${UUID.randomUUID()}@example.com"))
        val retainedUser = users.saveAndFlush(User(email = "${UUID.randomUUID()}@example.com"))
        val removedId = assertNotNull(removedUser.id)
        val retainedId = assertNotNull(retainedUser.id)
        val providerId = UUID.randomUUID().toString()
        identities.saveAndFlush(
            Identity(user = removedUser, provider = AuthProvider.GITHUB, providerUserId = providerId),
        )
        val retainedIdentity = identities.saveAndFlush(
            Identity(
                user = retainedUser,
                provider = AuthProvider.GITHUB,
                providerUserId = UUID.randomUUID().toString(),
            ),
        )
        val retainedIdentityId = assertNotNull(retainedIdentity.id)

        // Detach identities before deleting their user: otherwise Hibernate checks
        // their stale user references before Postgres can execute its cascade.
        entityManager.clear()
        // Reload only the user, leaving identity deletion to the database foreign key.
        users.deleteById(removedId)
        users.flush()
        entityManager.clear()

        assertTrue(users.findById(removedId).isEmpty)
        assertTrue(identities.findAllByUser_Id(removedId).isEmpty())
        assertNull(identities.findByProviderAndProviderUserId(AuthProvider.GITHUB, providerId))
        assertTrue(users.findById(retainedId).isPresent)
        assertEquals(
            listOf(retainedIdentityId),
            identities.findAllByUser_Id(retainedId).map { it.id },
        )
    }
}
