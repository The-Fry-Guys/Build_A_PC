package com.example.demo

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.boot.testcontainers.service.connection.ServiceConnection
import org.springframework.context.annotation.Bean
import org.testcontainers.postgresql.PostgreSQLContainer

/** Provides a disposable, schema-initialized database owned by the Spring test context. */
@TestConfiguration(proxyBeanMethods = false)
class PostgresTestConfiguration {
    /** Supplies dynamically mapped connection details; no hosted database or fixed port is used. */
    @Bean
    @ServiceConnection
    fun postgres(): PostgreSQLContainer = PostgreSQLContainer("postgres:16")
        .withDatabaseName("buildapc_test")
        .withUsername("buildapc")
        .withPassword("local-test-only")
        .withInitScript("db/migration/V1__initial_schema.sql")
}
