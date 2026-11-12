package com.example.demo

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.ActiveProfiles
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.ApplicationContext
import kotlin.test.assertTrue

/** Verifies application startup with an isolated test database. */
@SpringBootTest
@ActiveProfiles("test")
@Import(PostgresTestConfiguration::class)
class DemoApplicationTests @Autowired constructor(private val context: ApplicationContext) {

	/** Verifies that Spring can create the application context. */
	@Test
	fun contextLoads() {
		assertTrue(context.containsBean("securityFilterChain"))
	}

}
