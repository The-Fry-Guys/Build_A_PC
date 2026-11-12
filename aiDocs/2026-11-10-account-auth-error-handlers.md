# Account authentication error handlers

Date: 2026-11-10

## Changes

- Added production handlers in `ApiExceptionHandler.kt` for
  `EmailNotVerifiedException` (400) and `ProviderConflictException` (409).
- Both handlers reuse the existing Problem Details helpers, preserving
  `application/problem+json`, type, title, status, detail, and request path.
  Conflict details name the existing GitHub or Google provider.
- The existing generic handler remains unchanged: unexpected failures return a
  sanitized 500 response rather than exposing internal exception details.
- Added four parameterized standalone MockMvc cases in `AccountAuthErrorTests.kt`
  for unverified email, GitHub conflict, Google conflict, and unexpected failure.
  They require neither a database nor GitHub access. The fixture controller is
  marked `@TestComponent` to exclude it from normal Spring Boot component scanning;
  it is instantiated directly in this test's standalone MockMvc setup.

## Validation

- Attempted `./gradlew test --tests com.example.demo.AccountAuthErrorTests
  --no-daemon`; the wrapper failed before compilation because the Gradle cache lock
  under `/home/austin/.gradle` is read-only in this session. Tests remain unverified.
- `git diff --check` passed.

No production routes, security configuration, database schema, OAuth exchange, or
JWT handling were added. Existing documentation outside `aiDocs/` was not changed.
