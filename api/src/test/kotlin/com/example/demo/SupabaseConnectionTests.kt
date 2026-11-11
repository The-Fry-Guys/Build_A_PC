package com.example.demo

import org.junit.jupiter.api.Tag
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.core.ConnectionCallback
import org.springframework.transaction.annotation.Transactional
import tools.jackson.databind.ObjectMapper
import java.net.URI
import kotlin.test.assertEquals
import kotlin.test.assertTrue

/** Run explicitly with ./gradlew supabaseTest; uses credentials already supplied to Spring. */
@Tag("supabase")
@SpringBootTest(properties = [
    "spring.jpa.hibernate.ddl-auto=none",
    "spring.sql.init.mode=never",
    "spring.datasource.hikari.maximum-pool-size=1",
    "spring.datasource.hikari.minimum-idle=0",
    // Public test fixture; this read-only test does not issue application tokens.
    "app.jwt.secret-base64=MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
])
@AutoConfigureMockMvc
@Transactional(readOnly = true)
class SupabaseConnectionTests @Autowired constructor(
    private val jdbcTemplate: JdbcTemplate,
    private val repository: CatalogPartRepository,
    private val mvc: MockMvc,
    private val objectMapper: ObjectMapper,
) {
    /** Verifies the Supabase host, PostgreSQL driver, connection validity, and a SQL query. */
    @Test
    fun `datasource connects to Supabase PostgreSQL and executes a query`() {
        // Reuse the transaction's connection instead of borrowing a second pool slot.
        jdbcTemplate.execute(ConnectionCallback { connection ->
            val metadata = connection.metaData
            assertEquals("PostgreSQL", metadata.databaseProductName)
            val host = URI(metadata.url.removePrefix("jdbc:")).host.orEmpty()
            assertTrue(host.endsWith(".supabase.com") || host.endsWith(".supabase.co"),
                "The integration test must connect to a Supabase host")
            assertTrue(connection.isValid(5), "Supabase connection should be valid")
        })
        assertEquals(1, jdbcTemplate.queryForObject("SELECT 1", Int::class.java))
    }

    /** Verifies that the remote catalog schema supports a bounded JPA query without writes. */
    @Test
    fun `catalog schema supports the actual repository query`() {
        // Works with an empty catalog and checks mapped columns without changing remote data.
        val page = repository.findAll(PageRequest.of(0, 1))
        assertTrue(page.content.size <= 1)
        assertTrue(page.totalElements >= 0)
    }

    /** Verifies that the HTTP catalog route returns the same records queried from Supabase. */
    @Test
    fun `parts endpoint returns the live Supabase page`() {
        val expected = repository.findAll(PageRequest.of(0, 10, Sort.by("id")))
        val response = mvc.get("/api/v1/parts?page=0&size=10")
            .andExpect {
                status { isOk() }
                content { contentTypeCompatibleWith("application/json") }
            }
            .andReturn()
        val actual = objectMapper.readTree(response.response.contentAsString)

        assertEquals(0, actual["page"].intValue())
        assertEquals(10, actual["size"].intValue())
        assertEquals(expected.totalElements, actual["totalElements"].longValue())
        assertEquals(expected.totalPages, actual["totalPages"].intValue())
        assertEquals(expected.content.size, actual["content"].size())
        expected.content.forEachIndexed { index, part ->
            val actualPart = actual["content"][index]
            assertEquals(part.id.toString(), actualPart["part_id"].stringValue())
            assertEquals(part.category, actualPart["category"].stringValue())
            assertEquals(part.name, actualPart["name"].stringValue())
            val expectedPrice = part.price
            if (expectedPrice == null) {
                assertTrue(actualPart["price"].isNull())
            } else {
                assertEquals(0, expectedPrice.compareTo(actualPart["price"].decimalValue()))
            }
        }
    }
}
