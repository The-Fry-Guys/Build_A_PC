package com.example.demo
import io.restassured.module.mockmvc.RestAssuredMockMvc
import io.restassured.module.mockmvc.RestAssuredMockMvc.given
import io.restassured.http.ContentType
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.web.servlet.MockMvc
import org.hamcrest.Matchers.*
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc

@SpringBootTest
@AutoConfigureMockMvc
class PCBuildIntegrationTests {
    @Autowired
    lateinit var mockMvc: MockMvc

    @Autowired
    lateinit var buildRepository: PCBuildRepository

    @Autowired
    lateinit var partRepository: CatalogPartRepository

    @BeforeEach
    fun setup() {
        RestAssuredMockMvc.mockMvc(mockMvc)
        buildRepository.deleteAll()
    }

    @Test
    fun `Creates a new PC build for an authenticated user`() {
        val testPart = partRepository.save(CatalogPart(category = "CPU", name = "Test CPU"))
        val requestBody = CreateBuildRequest(
            name = "My First Build",
            partIds = listOf(testPart.id)
        )

        given()
            .auth().with(jwt().jwt { it.subject("google-oauth2|12345") })
            .contentType(ContentType.JSON)
            .body(requestBody)
            .`when`()
            .post("/api/v1/builds")
            .then()
            .statusCode(201)
            .body("name", equalTo("My First Build"))
            .body("parts[0].name", equalTo("Test CPU"))
    }

    @Test
    fun `Returns only the builds owned by the requesting user`() {
        buildRepository.save(PCBuild(userId = "user-A", name = "Build A"))
        buildRepository.save(PCBuild(userId = "user-B", name = "Build B"))

        given()
            .auth().with(jwt().jwt { it.subject("user-A") })
            .`when`()
            .get("/api/v1/builds")
            .then()
            .statusCode(200)
            .body("size()", equalTo(1))
            .body("[0].name", equalTo("Build A"))
    }
}