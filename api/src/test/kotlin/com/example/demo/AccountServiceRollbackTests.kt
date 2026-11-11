package com.example.demo

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.doAnswer
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertSame

/** Verifies rollback at the actual service transaction boundary. */
@SpringBootTest
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
class AccountServiceRollbackTests {
    @Autowired
    private lateinit var service: AccountService

    @Autowired
    private lateinit var jdbc: JdbcTemplate

    @MockitoSpyBean
    private lateinit var identities: IdentityRepository

    private val email = "${UUID.randomUUID()}@example.com"
    private val providerId = UUID.randomUUID().toString()

    /** Removes test data even if a regression leaves a committed user behind. */
    @AfterEach
    fun cleanUp() {
        // Also removes identities through the database cascade.
        jdbc.update("DELETE FROM public.users WHERE email = ?", email)
    }

    @Test
    fun `identity save failure rolls back the newly inserted user`() {
        val failure = IllegalStateException("Simulated identity write failure")

        doAnswer {
            // This runs inside the service transaction, after user insertion.
            val count = jdbc.queryForObject(
                "SELECT count(*) FROM public.users WHERE email = ?",
                Long::class.java,
                email,
            )
            assertEquals(1L, count)

            throw failure
        }.`when`(identities).saveAndFlush(any(Identity::class.java))

        val thrown = assertThrows<IllegalStateException> {
            service.findOrCreate(
                ProviderIdentity(
                    provider = AuthProvider.GITHUB,
                    providerUserId = providerId,
                    email = email,
                    emailVerified = true,
                ),
            )
        }

        assertSame(failure, thrown)

        // The service call has ended; these queries run after its rollback.
        assertEquals(
            0L,
            jdbc.queryForObject(
                "SELECT count(*) FROM public.users WHERE email = ?",
                Long::class.java,
                email,
            ),
        )
        assertEquals(
            0L,
            jdbc.queryForObject(
                """
                SELECT count(*) FROM public.identities
                WHERE provider = ? AND provider_user_id = ?
                """.trimIndent(),
                Long::class.java,
                "GITHUB",
                providerId,
            ),
        )
    }
}
