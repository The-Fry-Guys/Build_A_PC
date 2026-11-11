package com.example.demo
import io.restassured.module.mockmvc.RestAssuredMockMvc
import io.restassured.module.mockmvc.RestAssuredMockMvc.given
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc

@SpringBootTest
@AutoConfigureMockMvc
class PCBuildOwnershipTests {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var buildRepository: PCBuildRepository

    @BeforeEach
    fun setup() {
        RestAssuredMockMvc.mockMvc(mockMvc)
        buildRepository.deleteAll()
    }

    @Test
    fun `User gets 403 Forbidden when attempting to delete another user's build`() {
        // Create a build owned by User B
        val userBBuild = buildRepository.save(
            PCBuild(userId = "user-B", name = "User B's Private Build")
        )
        given()
            .auth().with(jwt().jwt { it.subject("user-A") })
            .`when`()
            .delete("/api/v1/builds/{id}", userBBuild.id)
            .then()
            .statusCode(403)
    }

    @Test
    fun `User gets 204 No Content when successfully deleting their own build`() {
        val userABuild = buildRepository.save(
            PCBuild(userId = "user-A", name = "User A's Build")
        )
        given()
            .auth().with(jwt().jwt { it.subject("user-A") })
            .`when`()
            .delete("/api/v1/builds/{id}", userABuild.id)
            .then()
            .statusCode(204)
    }
}