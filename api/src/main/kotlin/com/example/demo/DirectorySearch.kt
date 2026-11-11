package com.example.demo

import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.data.jpa.domain.Specification
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException
import java.util.Locale
import java.util.UUID

/** Validates bounded pagination before constructing a database request. */
fun directoryPage(page: Int, size: Int): PageRequest {
    if (page < 0 || size !in 1..100 || page.toLong() * size > Int.MAX_VALUE) {
        throw ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid pagination: page must be nonnegative, size 1..100, and offset within integer range.")
    }
    return PageRequest.of(page, size, Sort.by("id"))
}

/** Builds literal substring predicates and an optional exact UUID match without raw SQL. */
fun <T : Any> directorySearch(query: String, vararg fields: String): Specification<T> {
    val term = query.trim().lowercase(Locale.ROOT)
    val pattern = "%${term.replace("!", "!!").replace("%", "!%").replace("_", "!_")}%"
    val id = runCatching { UUID.fromString(term) }.getOrNull()
    return Specification { root, _, builder ->
        val matches = fields.map { field -> builder.like(builder.lower(root.get<String>(field)), pattern, '!') }.toMutableList()
        if (id != null) matches.add(builder.equal(root.get<UUID>("id"), id))
        builder.or(*matches.toTypedArray())
    }
}
