package com.example.demo

import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.math.BigDecimal
import java.util.UUID

@RestController
@RequestMapping("/api/v1/parts")
class CatalogPartController {
    @GetMapping
    fun getParts(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "10") size: Int,
    ): CatalogPartPage {
        if (page < 0 || size !in 1..100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "page must be nonnegative and size must be between 1 and 100")
        }

        val parts = sampleParts()
        val fromIndex = (page.toLong() * size).coerceAtMost(parts.size.toLong()).toInt()
        val toIndex = (fromIndex + size).coerceAtMost(parts.size)
        val totalPages = if (parts.isEmpty()) 0 else (parts.size + size - 1) / size

        return CatalogPartPage(
            content = parts.subList(fromIndex, toIndex),
            page = page,
            size = size,
            totalElements = parts.size,
            totalPages = totalPages,
        )
    }

    private fun sampleParts(): List<CatalogPart> = listOf(
        CatalogPart(
            id = UUID.fromString("11111111-1111-1111-1111-111111111111"),
            category = "CPU",
            name = "Example 8-Core Processor",
            price = BigDecimal("249.99"),
        ),
        CatalogPart(
            id = UUID.fromString("22222222-2222-2222-2222-222222222222"),
            category = "Memory",
            name = "Example 32 GB DDR5 Kit",
            price = BigDecimal("89.99"),
        ),
    )
}

data class CatalogPartPage(
    val content: List<CatalogPart>,
    val page: Int,
    val size: Int,
    val totalElements: Int,
    val totalPages: Int,
)
