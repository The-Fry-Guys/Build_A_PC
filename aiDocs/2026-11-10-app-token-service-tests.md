# App token service tests

Date: 2026-11-10

## Changes

Added `AppTokenServiceTests.kt` with the previously reviewed JWT tests. Components
are instantiated directly using public fixture keys; no Spring context, Docker,
database, GitHub access, or actual signing secrets are needed.

- USER and ADMIN token cases check HS256, subject, issuer, email, roles, and the
  default one-hour lifetime after real signature validation.
- A custom TTL case verifies a fifteen-minute token lifetime.
- Rejection cases cover a different signing key, wrong issuer, expiry beyond the
  default clock-skew allowance, and users without an assigned ID.
- The signing helper constructs deliberately invalid tokens to exercise the real
  decoder. Assigned fixture UUIDs do not establish that users exist in a database.

## Validation

- Attempted `./gradlew test --tests com.example.demo.AppTokenServiceTests
  --no-daemon`; the wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. Execution remains unverified.
- `git diff --check` passed.

No production code, security rules, schema, environment files, or existing
documentation was changed in this chunk.
