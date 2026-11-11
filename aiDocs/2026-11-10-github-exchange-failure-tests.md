# GitHub exchange failure tests

Date: 2026-11-10

## Changes

Extended `GitHubIdentityClientTests.kt` with the reviewed mock-response helpers and
15 additional test invocations:

- Rejected authorization code returns 400.
- Empty email lists, unverified primary emails, and verified secondary-only emails
  throw `EmailNotVerifiedException`.
- Missing/empty tokens, malformed token JSON, and incorrect-client-credentials
  responses return sanitized 502 errors.
- HTTP 500 failures at token, user, and email stages return the expected safe 502
  reason without retaining a provider exception cause.
- Blank codes, short PKCE verifiers, and unknown callbacks are rejected before any
  HTTP request; the mock server has no request expectations in these cases.
- Missing display names fall back to the GitHub login.

The existing successful exchange test remains unchanged. All fixtures are fake;
these tests need neither Spring startup, Docker, real credentials, nor GitHub.

## Validation

- Attempted `./gradlew test --tests com.example.demo.GitHubIdentityClientTests
  --no-daemon`; Gradle failed before compilation because its wrapper cache lock
  under `/home/austin/.gradle` is read-only in this session. Execution remains
  unverified here.
- `git diff --check` passed.

No production code, schema, environment files, or existing documentation changed.
This chunk tests response handling, not real network timeouts or transport behavior.
