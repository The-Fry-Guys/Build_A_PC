# Account service decision tests

Date: 2026-11-10

## Changes

Added `api/src/test/kotlin/com/example/demo/AccountServiceTests.kt` with the four
previously reviewed PostgreSQL integration tests:

- New verified identities persist a user and identity with the USER role.
- Known provider identities return their original user before checking changed
  email or verification details, without creating additional records.
- New unverified identities throw `EmailNotVerifiedException` without inserts.
- A GitHub identity using an existing Google email throws a conflict naming Google
  and does not create an additional user or identity.

The tests reuse `PostgresTestConfiguration` and the test profile. They use unique
fixture values and test-managed transactions for rollback cleanup. Creation and
repeat-login tests clear the entity manager to exercise database retrieval.

## Validation

- Attempted `./gradlew test --tests com.example.demo.AccountServiceTests --no-daemon`.
  The Gradle wrapper failed before compilation because its cache lock file under
  `/home/austin/.gradle` is read-only in this session. Tests remain unverified here.
- `git diff --check` passed.

## Remaining work

A separate rollback test without a surrounding test transaction is still needed
to prove the service rolls back the newly inserted user when identity insertion
fails. The four decision tests do not establish that guarantee. No production code,
HTTP mappings, schema, or documentation outside `aiDocs/` was changed in this chunk.
