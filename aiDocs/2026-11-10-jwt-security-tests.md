# JWT HTTP security tests

Date: 2026-11-10

## Changes

Added `JwtSecurityTests.kt` with the reviewed MVC slice loading the real security
filter, JWT configuration, token service, profile controller, catalog controller,
health controller, and exception advice. Database dependencies are mocked.

- Missing token returns 401 Problem Details and a Bearer challenge without account
  lookup. Valid signed tokens return current profile fields and no-store headers.
- Malformed, expired, wrong-key, and wrong-issuer tokens return 401 before account
  lookup. Tests use actual signatures with public fixture keys, not mocked decoder
  results. The expiry fixture exceeds the standard clock-skew allowance.
- A valid token with no corresponding user returns the account-unavailable 401.
- USER tokens receive 403 in the admin namespace. ADMIN tokens pass that check and
  receive 404 because an admin controller is not yet implemented.
- Catalog browsing and database-health routes remain accessible without a token.

No actual database, Docker container, GitHub account, or real signing secret is used.
The mock repository simulates missing accounts; no hosted account is deleted.

## Validation

- Attempted `./gradlew test --tests com.example.demo.JwtSecurityTests --no-daemon`;
  the wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. Test execution remains
  unverified here.
- `git diff --check` passed.

No production code, schema, environment files, or existing documentation changed.
CORS implementation and preflight tests remain the next chunk.
