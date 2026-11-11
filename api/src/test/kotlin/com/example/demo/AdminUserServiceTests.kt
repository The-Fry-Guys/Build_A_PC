package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.data.domain.PageImpl
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.UUID
import kotlin.test.assertEquals
import kotlin.test.assertNull

/** Verifies directory mapping and pagination decisions without starting Spring or a database. */
class AdminUserServiceTests {
    private val users = mock(UserRepository::class.java)
    private val service = AdminUserService(users)

    /** An unfiltered request retains nullable names and reports real database totals. */
    @Test
    fun `blank search maps approved profile fields and metadata`() {
        val user = User(email = "user@example.test", displayName = null, id = UUID.randomUUID())
        val request = directoryPage(0, 1)
        `when`(users.findAll(request)).thenReturn(PageImpl(listOf(user), request, 2))
        val result = service.listUsers("  ", 0, 1)
        assertEquals(2, result.totalPages)
        assertEquals(2L, result.totalElements)
        assertEquals(user.id, result.content.single().id)
        assertNull(result.content.single().displayName)
    }

    /** Invalid limits and excessive offsets must fail before issuing any SQL. */
    @Test
    fun `invalid pages are rejected`() {
        for ((page, size) in listOf(-1 to 10, 0 to 0, 0 to 101, Int.MAX_VALUE to 100)) {
            val error = assertThrows<ResponseStatusException> { service.listUsers(null, page, size) }
            assertEquals(HttpStatus.BAD_REQUEST, error.statusCode)
        }
    }
}
