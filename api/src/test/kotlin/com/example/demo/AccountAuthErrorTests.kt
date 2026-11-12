package com.example.demo

import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.springframework.boot.test.context.TestComponent
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

/** Tests account error responses without a database or OAuth provider. */
class AccountAuthErrorTests {
    private val mvc = MockMvcBuilders
        .standaloneSetup(ErrorController())
        .setControllerAdvice(ApiExceptionHandler())
        .build()

    @ParameterizedTest
    @CsvSource(
        "unverified,400,Bad Request,Verify your email at the provider before signing in.",
        "github,409,Conflict,This email is already registered with GitHub. Sign in with that provider.",
        "google,409,Conflict,This email is already registered with Google. Sign in with that provider.",
        "unexpected,500,Internal Server Error,An unexpected error occurred.",
    )
    fun `account errors return the expected problem details`(
        kind: String,
        expectedStatus: Int,
        expectedTitle: String,
        expectedDetail: String,
    ) {
        mvc.get("/test/account-error") {
            param("kind", kind)
        }.andExpect {
            status { isEqualTo(expectedStatus) }
            content {
                contentTypeCompatibleWith("application/problem+json")
            }
            jsonPath("$.type") { value("about:blank") }
            jsonPath("$.status") { value(expectedStatus) }
            jsonPath("$.title") { value(expectedTitle) }
            jsonPath("$.detail") { value(expectedDetail) }
            jsonPath("$.instance") { value("/test/account-error") }
        }
    }

    /** Exists only in this test's standalone MockMvc setup. */
    @TestComponent
    @RestController
    class ErrorController {
        @GetMapping("/test/account-error")
        fun fail(@RequestParam kind: String): String =
            when (kind) {
                "unverified" -> throw EmailNotVerifiedException()
                "github" -> throw ProviderConflictException(AuthProvider.GITHUB)
                "google" -> throw ProviderConflictException(AuthProvider.GOOGLE)
                else -> error("Private internal information")
            }
    }
}
