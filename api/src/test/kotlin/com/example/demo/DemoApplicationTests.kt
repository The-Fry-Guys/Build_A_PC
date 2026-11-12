package com.example.demo

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.test.context.ActiveProfiles

/** Verifies application startup with an isolated test database. */
@SpringBootTest
@ActiveProfiles("test")
class DemoApplicationTests {

	/** Verifies that Spring can create the application context. */
	@Test
	fun contextLoads() {
	}

}
