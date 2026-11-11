# Account service rollback test

Date: 2026-11-10

## Changes

Added `api/src/test/kotlin/com/example/demo/AccountServiceRollbackTests.kt` using
the reviewed code and existing Testcontainers PostgreSQL configuration.

- No test-level transaction wraps the service call, so the service proxy owns the
  transaction and must perform rollback before returning the exception.
- A Mockito spy delegates identity lookups to the real repository but intercepts
  `saveAndFlush` to throw a controlled failure.
- The interception first checks that the user insert is visible inside the service
  transaction. Queries after the failed call verify that neither the user nor the
  identity remains.
- Cleanup deletes only the unique fixture email, with database cascading for any
  associated identity, even if a rollback regression leaves a committed record.

## Validation

- Attempted `./gradlew test --tests com.example.demo.AccountServiceRollbackTests
  --no-daemon`. The wrapper failed before compilation because its cache lock file
  under `/home/austin/.gradle` is read-only in this session. The test remains
  unverified here.
- `git diff --check` passed.

No production code, schema, HTTP error mappings, or existing documentation was
changed. Only this new log was added under `aiDocs/` for this chunk.
