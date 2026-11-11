# Account service

Date: 2026-11-10

## Changes

Added `api/src/main/kotlin/com/example/demo/AccountService.kt` with the previously
reviewed `findOrCreate(ProviderIdentity): User` implementation.

1. An existing provider identity returns its associated user without modifying it.
2. An unknown identity with an unverified email throws `EmailNotVerifiedException`.
3. An existing email throws `ProviderConflictException` naming its existing provider.
   An inconsistent account with no provider identity throws an unexpected state error.
4. A new verified identity creates a user with the default USER role and a linked
   identity. Both writes use `saveAndFlush` inside one Spring transaction, so a
   failure rolls back the operation.

Email comparisons retain the repository's exact-match behavior. No automatic linking
or concurrent-signup retry was added; database uniqueness violations still propagate.

## Validation and remaining work

- Attempted `./gradlew compileKotlin --no-daemon`; the Gradle wrapper could not open
  its cache lock under `/home/austin/.gradle` because that filesystem is read-only in
  this session. Compilation remains unverified.
- `git diff --check` passed.
- Service decision and rollback tests remain the next chunk. Transaction rollback
  is intended by the annotation but has not yet been verified by service tests.
- No database schema, endpoints, exception-handler mappings, GitHub requests, JWTs,
  or existing documentation were changed. This file is the only documentation added
  for this chunk, under `aiDocs/` as requested.
