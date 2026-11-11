package com.example.demo

import org.junit.jupiter.api.Test
import org.springframework.mock.env.MockEnvironment
import kotlin.test.assertFailsWith

/** Verifies that the local test authentication harness refuses production configuration. */
class E2eProfileGuardTests {
    /** Both common production profile names must reject the e2e token route at startup. */
    @Test
    fun `production and e2e cannot run together`() {
        for (profile in listOf("prod", "production")) {
            val environment = MockEnvironment().withProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/test")
            environment.setActiveProfiles("e2e", profile)
            assertFailsWith<IllegalStateException> { E2eProfileGuard(environment) }
        }
    }

    /** A production database hostname must be rejected even without a named production profile. */
    @Test
    fun `hosted database is rejected`() {
        val environment = MockEnvironment().withProperty("spring.datasource.url", "jdbc:postgresql://hosted.example:5432/postgres")
        environment.setActiveProfiles("e2e")
        assertFailsWith<IllegalStateException> { E2eProfileGuard(environment) }
    }
}
