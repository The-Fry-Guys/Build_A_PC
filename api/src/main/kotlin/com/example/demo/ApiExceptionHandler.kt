package com.example.demo

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ProblemDetail
import org.springframework.http.ResponseEntity
import org.springframework.http.converter.HttpMessageNotReadableException
import org.springframework.web.ErrorResponseException
import org.springframework.web.ErrorResponse
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException
import org.springframework.web.servlet.resource.NoResourceFoundException
import java.net.URI

@RestControllerAdvice
class ApiExceptionHandler {
    @ExceptionHandler(ResourceNotFoundException::class)
    fun handleResourceNotFound(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        response(problemDetail(HttpStatus.NOT_FOUND, "The requested resource was not found.", request))

    @ExceptionHandler(MethodArgumentTypeMismatchException::class)
    fun handleInvalidParameter(
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        response(problemDetail(HttpStatus.BAD_REQUEST, "A request parameter has an invalid value.", request))

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        exception: MethodArgumentNotValidException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val problem = problemDetail(HttpStatus.BAD_REQUEST, "Request validation failed.", request)
        problem.setProperty(
            "errors",
            exception.bindingResult.fieldErrors.map { error ->
                mapOf("field" to error.field, "message" to (error.defaultMessage ?: "Invalid value."))
            },
        )
        return response(problem)
    }

    @ExceptionHandler(HttpMessageNotReadableException::class)
    fun handleUnreadableRequest(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        response(problemDetail(HttpStatus.BAD_REQUEST, "Request body is missing or malformed.", request))

    /** Preserves status codes, headers, and Problem Details from framework exceptions. */
    @ExceptionHandler(ErrorResponseException::class)
    fun handleFrameworkError(
        exception: ErrorResponseException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> = frameworkResponse(exception, request)

    @ExceptionHandler(NoResourceFoundException::class)
    fun handleMissingRoute(request: HttpServletRequest): ResponseEntity<ProblemDetail> =
        response(problemDetail(HttpStatus.NOT_FOUND, "The requested resource was not found.", request))

    /** Rejects registration with an unverified provider email. */
    @ExceptionHandler(EmailNotVerifiedException::class)
    fun handleUnverifiedEmail(
        exception: EmailNotVerifiedException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        response(
            problemDetail(
                HttpStatus.BAD_REQUEST,
                exception.message ?: "Verify your email at the provider.",
                request,
            ),
        )

    /** Directs the user to the provider already associated with their email. */
    @ExceptionHandler(ProviderConflictException::class)
    fun handleProviderConflict(
        exception: ProviderConflictException,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> =
        response(
            problemDetail(
                HttpStatus.CONFLICT,
                exception.message ?: "Sign in with your existing provider.",
                request,
            ),
        )

    /** Preserves other framework HTTP errors and sanitizes unexpected server failures. */
    @ExceptionHandler(Exception::class)
    fun handleUnexpected(
        exception: Exception,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        if (exception is ErrorResponse) {
            return frameworkResponse(exception, request)
        }
        logger.error("Unhandled API error for {}", request.requestURI, exception)
        return response(
            problemDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred.",
                request,
            ),
        )
    }

    /** Builds a Problem Details response while retaining headers such as Allow. */
    private fun frameworkResponse(
        exception: ErrorResponse,
        request: HttpServletRequest,
    ): ResponseEntity<ProblemDetail> {
        val problem = exception.body
        problem.type = problem.type ?: URI.create("about:blank")
        if (problem.instance == null) {
            problem.instance = URI.create(request.requestURI)
        }
        return ResponseEntity.status(exception.statusCode)
            .headers(exception.headers)
            .contentType(MediaType.APPLICATION_PROBLEM_JSON)
            .body(problem)
    }

    private fun response(problem: ProblemDetail): ResponseEntity<ProblemDetail> =
        ResponseEntity.status(problem.status).contentType(MediaType.APPLICATION_PROBLEM_JSON).body(problem)

    private companion object {
        val logger = LoggerFactory.getLogger(ApiExceptionHandler::class.java)
    }
}

class ResourceNotFoundException : RuntimeException()
