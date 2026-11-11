# GitHub login controller tests

Date: 2026-11-10

## Changes

Added `GitHubAuthControllerTests.kt` with the reviewed standalone MockMvc setup
using the actual controller and exception advice plus mocked provider, account,
and token services. No Docker, database, Spring application context, or credentials
are needed.

- Success verifies the token/user response, six public user fields, snake_case
  names, JSON media type, no-store/no-cache headers, and service invocation order.
- Three invalid-input cases and two malformed/missing-field cases verify 400
  responses before any service interaction.
- Unverified email and provider failures verify 400/502 responses without account
  creation or token issuance. Account conflict verifies 409 naming Google and no
  token issuance. Error responses have no token field.

## Validation

- Attempted `./gradlew test --tests com.example.demo.GitHubAuthControllerTests
  --no-daemon`; the wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. Tests remain unverified here.
- `git diff --check` passed.

No production code, environment files, schema, existing documentation, JWT request
filters, or CORS configuration changed. These controller tests do not establish
end-to-end sign-in, real token validation, or database transaction behavior.
