package com.example.demo

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import tools.jackson.databind.ObjectMapper
import java.net.URI

internal fun problemDetail(
    status: HttpStatus,
    detail: String,
    request: HttpServletRequest,
): ProblemDetail = ProblemDetail.forStatusAndDetail(status, detail).apply {
    type = URI.create("about:blank")
    title = status.reasonPhrase
    instance = URI.create(request.requestURI)
}

internal fun writeProblemDetail(
    status: HttpStatus,
    detail: String,
    request: HttpServletRequest,
    response: HttpServletResponse,
    objectMapper: ObjectMapper,
) {
    response.status = status.value()
    response.contentType = MediaType.APPLICATION_PROBLEM_JSON_VALUE
    objectMapper.writeValue(response.outputStream, problemDetail(status, detail, request))
}
