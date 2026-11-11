# GitHub successful exchange test

Date: 2026-11-10

## Changes

Added `GitHubIdentityClientTests.kt` with the previously reviewed successful
exchange scenario. MockRestServiceServer intercepts RestClient requests and returns
simulated GitHub JSON, without Spring startup, Docker, hosted services, or secrets.

The test verifies the form-encoded token request includes the fake client ID,
secret, authorization code, PKCE verifier, and exact callback, and requests JSON.
It verifies Bearer authentication on the subsequent user and email requests and
checks stable provider ID, display name, and verified primary email extraction.
A verified secondary email is listed first to exercise primary-email selection.
The fixture includes unrelated JSON fields to exercise tolerant deserialization.
`server.verify()` checks the three expected requests were made in order.

## Validation

- Attempted `./gradlew test --tests com.example.demo.GitHubIdentityClientTests
  --no-daemon`; the wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. Test execution is unverified.
- `git diff --check` passed.

Failure-response tests remain the next chunk. This test does not exercise the real
network transport or timeout settings. No production code, environment files,
schema, or existing documentation was modified in this chunk.
