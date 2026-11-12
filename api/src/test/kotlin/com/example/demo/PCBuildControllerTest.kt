package com.example.demo
import org.junit.jupiter.api.Test
import org.mockito.ArgumentMatchers.any
import org.mockito.Mockito.never
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.http.MediaType
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import tools.jackson.databind.ObjectMapper
import java.util.Optional
import java.util.UUID

@WebMvcTest(PCBuildController::class)
@Import(SecurityConfig::class)
class PCBuildControllerTest @Autowired constructor(
    private val mvc: MockMvc,
    private val objectMapper: ObjectMapper
) {

    @MockitoBean
    private lateinit var buildRepository: PCBuildRepository

    @MockitoBean
    private lateinit var partRepository: CatalogPartRepository

    @Test
    fun `createBuild returns 400 Bad Request when one or more part IDs do not exist in catalog`() {
        val foundPart = CatalogPart(category = "CPU", name = "Test CPU")
        val validPartId = foundPart.id
        val invalidPartId = UUID.randomUUID()

        val request = CreateBuildRequest("My Build", listOf(validPartId, invalidPartId))

        `when`(partRepository.findAllById(request.partIds)).thenReturn(listOf(foundPart))

        mvc.perform(
            post("/api/v1/builds")
                .with(jwt().jwt { it.subject("google-oauth2|123") })
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        ).andExpect(status().isBadRequest)
    }

    @Test
    fun `createBuild successfully saves and returns 201 Created`() {
        val foundPart = CatalogPart(category = "GPU", name = "Test GPU")
        val request = CreateBuildRequest("Dream PC", listOf(foundPart.id))

        `when`(partRepository.findAllById(request.partIds)).thenReturn(listOf(foundPart))
        `when`(buildRepository.save(any(PCBuild::class.java))).thenAnswer { invocation ->
            invocation.arguments[0] as PCBuild
        }

        mvc.perform(
            post("/api/v1/builds")
                .with(jwt().jwt { it.subject("google-oauth2|123") })
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request))
        )
            .andExpect(status().isCreated)
            .andExpect(jsonPath("$.name").value("Dream PC"))
            .andExpect(jsonPath("$.parts[0].name").value("Test GPU"))

        verify(buildRepository).save(any(PCBuild::class.java))
    }

    @Test
    fun `deleteBuild returns 404 Not Found when build does not exist`() {
        val buildId = UUID.randomUUID()
        `when`(buildRepository.findById(buildId)).thenReturn(Optional.empty())

        mvc.perform(
            delete("/api/v1/builds/$buildId")
                .with(jwt().jwt { it.subject("google-oauth2|123") })
        ).andExpect(status().isNotFound)
    }

    @Test
    fun `deleteBuild returns 403 Forbidden when user attempts to delete a build they do not own`() {
        val buildId = UUID.randomUUID()
        val existingBuild = PCBuild(id = buildId, userId = "target-user-id", name = "Target's Build")

        `when`(buildRepository.findById(buildId)).thenReturn(Optional.of(existingBuild))

        mvc.perform(
            delete("/api/v1/builds/$buildId")
                .with(jwt().jwt { it.subject("malicious-user-id") })
        ).andExpect(status().isForbidden)

        verify(buildRepository, never()).delete(any(PCBuild::class.java))
    }

    @Test
    fun `deleteBuild returns 204 No Content when user owns the build`() {
        val buildId = UUID.randomUUID()
        val existingBuild = PCBuild(id = buildId, userId = "valid-user-id", name = "My Build")

        `when`(buildRepository.findById(buildId)).thenReturn(Optional.of(existingBuild))

        mvc.perform(
            delete("/api/v1/builds/$buildId")
                .with(jwt().jwt { it.subject("valid-user-id") })
        ).andExpect(status().isNoContent)

        verify(buildRepository).delete(existingBuild)
    }
}