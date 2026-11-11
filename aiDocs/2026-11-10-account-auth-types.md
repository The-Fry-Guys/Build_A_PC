# Account authentication types

Date: 2026-11-10

## Changes

- Added `api/src/main/kotlin/com/example/demo/AccountAuthTypes.kt`.
- `ProviderIdentity` carries provider, stable provider user ID, email, verification
  status, and an optional display name. It is internal provider-integration data,
  not a client request DTO. It reuses the existing `AuthProvider` enum.
- `EmailNotVerifiedException` represents rejection of a new identity with an
  unverified email.
- `ProviderConflictException` retains the existing provider and produces a message
  naming GitHub or Google, directing the user to their existing sign-in provider.

## Boundaries

No account service, persistence changes, OAuth calls, endpoints, JWTs, or exception
handler mappings were added. The planned 400/409 mappings remain later work; adding
these exception classes alone does not change HTTP behavior. No documentation
outside `aiDocs/` was modified.

## Validation

- Attempted `./gradlew compileKotlin --no-daemon` from `api/`. Gradle failed before
  compilation because its wrapper lock file under `/home/austin/.gradle` is on a
  read-only filesystem in this session. Compilation remains unverified.
- `git diff --check` passed.
