package com.example.demo
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.ArgumentMatchers.eq
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.http.MediaType
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import java.math.BigDecimal
import java.time.Instant
import java.util.UUID

@WebMvcTest(CatalogPartController::class)
@Import(SecurityConfig::class)
class CatalogPartControllerTest @Autowired constructor(private val mvc: MockMvc) {
    @MockitoBean
    private lateinit var jwtDecoder: JwtDecoder

    @MockitoBean
    private lateinit var userRepository: UserRepository

    @MockitoBean
    private lateinit var repository: CatalogPartRepository

    @Test
    fun `getParts filters by category when category param is provided`() {
        val cpuPart = CatalogPart(
            id = UUID.randomUUID(),
            category = "CPU",
            name = "Test CPU",
            price = BigDecimal("199.99"),
            createdAt = Instant.now()
        )
        val page = PageImpl(listOf(cpuPart))

        `when`(repository.findByCategory(
            eq("CPU") ?: "CPU",
            any(Pageable::class.java) ?: Pageable.unpaged()
        )).thenReturn(page)

        mvc.perform(get("/api/v1/parts?category=CPU")
            .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].category").value("CPU"))
            .andExpect(jsonPath("$.content[0].name").value("Test CPU"))
    }

    @Test
    fun `getParts returns empty list when category has no matches`() {
        val emptyPage = PageImpl<CatalogPart>(emptyList())

        `when`(repository.findByCategory(
            eq("UNKNOWN") ?: "UNKNOWN",
            any(Pageable::class.java) ?: Pageable.unpaged()
        )).thenReturn(emptyPage)

        mvc.perform(get("/api/v1/parts?category=UNKNOWN")
            .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content.size()").value(0))
    }
}