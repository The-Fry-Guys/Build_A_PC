package com.example.demo

import org.springframework.http.MediaType
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

/** Exposes API information under the versioned base route. */
@RestController
@RequestMapping("/api/v1", produces = [MediaType.APPLICATION_JSON_VALUE])
class HelloController {
    /** Returns the API name and version. */
    @GetMapping("", "/")
    fun index() = ApiInfo(name = "Build A PC API", version = "v1")

}

/** Carries the public API name and version. */
data class ApiInfo(val name: String, val version: String)
