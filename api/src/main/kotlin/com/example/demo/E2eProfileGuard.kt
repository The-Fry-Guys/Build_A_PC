package com.example.demo

import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile
import org.springframework.core.env.Environment
import java.net.URI

/** Refuses test token issuance in production profiles or against a hosted database. */
@Configuration(proxyBeanMethods = false)
@Profile("e2e")
class E2eProfileGuard(environment: Environment) {
    init {
        check(environment.activeProfiles.none { it.equals("prod", true) || it.equals("production", true) }) {
            "The e2e profile cannot run with a production profile."
        }
        val host = runCatching {
            URI(environment.getRequiredProperty("spring.datasource.url").removePrefix("jdbc:")).host
        }.getOrNull()
        check(host in setOf("localhost", "127.0.0.1", "db", "[::1]", "::1")) {
            "The e2e profile requires an isolated local Postgres database."
        }
    }
}
