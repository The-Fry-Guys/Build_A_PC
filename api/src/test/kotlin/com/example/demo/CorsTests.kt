package com.example.demo

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.options
import java.util.UUID

/** Tests CORS processing through the real security filter. */
@WebMvcTest(
    controllers = [MeController::class],
    properties = [
        "app.cors.allowed-origins=http://localhost:8081,https://web.buildapc.test",
    ],
)
@Import(SecurityConfig::class)
class CorsTests {
    @Autowired
    private lateinit var mvc: MockMvc

    @MockitoBean
    private lateinit var users: UserRepository

    @MockitoBean
    private lateinit var decoder: JwtDecoder

    @ParameterizedTest
    @ValueSource(strings = ["http://localhost:8081", "https://web.buildapc.test"])
    fun `allowed preflight succeeds without authentication`(origin: String) {
        mvc.options("/api/v1/me") {
            header("Origin", origin)
            header("Access-Control-Request-Method", "GET")
            header("Access-Control-Request-Headers", "Authorization")
        }.andExpect {
            status { isOk() }
            header {
                string("Access-Control-Allow-Origin", origin)
                string("Access-Control-Allow-Headers", "Authorization")
                doesNotExist("Access-Control-Allow-Credentials")
            }
        }

        verifyNoInteractions(users, decoder)
    }

    @Test
    fun `JSON login preflight succeeds without authentication`() {
        mvc.options("/api/v1/auth/github") {
            header("Origin", "http://localhost:8081")
            header("Access-Control-Request-Method", "POST")
            header("Access-Control-Request-Headers", "Content-Type")
        }.andExpect {
            status { isOk() }
            header {
                string("Access-Control-Allow-Origin", "http://localhost:8081")
                string("Access-Control-Allow-Headers", "Content-Type")
            }
        }

        verifyNoInteractions(users, decoder)
    }

    @ParameterizedTest
    @ValueSource(strings = ["https://unknown.example", "http://localhost:8082", "null"])
    fun `unapproved origins are rejected`(origin: String) {
        mvc.options("/api/v1/me") {
            header("Origin", origin)
            header("Access-Control-Request-Method", "GET")
        }.andExpect {
            status { isForbidden() }
            header { doesNotExist("Access-Control-Allow-Origin") }
        }

        verifyNoInteractions(users, decoder)
    }

    @Test
    fun `unapproved request headers are rejected`() {
        mvc.options("/api/v1/me") {
            header("Origin", "http://localhost:8081")
            header("Access-Control-Request-Method", "GET")
            header("Access-Control-Request-Headers", "X-Unapproved-Header")
        }.andExpect {
            status { isForbidden() }
            header { doesNotExist("Access-Control-Allow-Origin") }
        }

        verifyNoInteractions(users, decoder)
    }

    @Test
    fun `unauthorized response retains CORS headers`() {
        mvc.get("/api/v1/me") {
            header("Origin", "http://localhost:8081")
        }.andExpect {
            status { isUnauthorized() }
            header { string("Access-Control-Allow-Origin", "http://localhost:8081") }
            content { contentTypeCompatibleWith("application/problem+json") }
        }

        verifyNoInteractions(users, decoder)
    }

    @Test
    fun `forbidden response retains CORS headers`() {
        val jwt = Jwt.withTokenValue("test-token")
            .header("alg", "HS256")
            .subject(UUID.randomUUID().toString())
            .claim("roles", listOf("USER"))
            .build()

        `when`(decoder.decode("test-token")).thenReturn(jwt)

        mvc.get("/api/v1/admin/users") {
            header("Origin", "http://localhost:8081")
            header("Authorization", "Bearer test-token")
        }.andExpect {
            status { isForbidden() }
            header { string("Access-Control-Allow-Origin", "http://localhost:8081") }
            content { contentTypeCompatibleWith("application/problem+json") }
        }

        verifyNoInteractions(users)
    }
}
