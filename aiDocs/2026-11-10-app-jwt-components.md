# App JWT components

Date: 2026-11-10

## Changes

- Added `spring-security-oauth2-jose` to supply JWT encoding and decoding support.
- Added `AppJwtProperties` for the existing issuer, Base64 secret, and TTL settings.
  Issuer must be nonblank and TTL at least one second.
- Added `AppJwtConfiguration` with a server-held HMAC key requiring at least 32
  decoded bytes, a Nimbus encoder, and an HS256 decoder validating issuer and token
  timestamps with Spring's standard clock-skew allowance. Missing or invalid signing
  configuration now prevents full application startup; there is no production
  fallback key.
- Added `AppTokenService.issueFor(User)` for users with an assigned persisted ID.
  It signs an HS256 token with subject, issuer, issued-at, expiry, email, and roles.
  Lifetime defaults to one hour through the existing configuration. This service
  does not itself authenticate the user or query the database to establish existence.
- Added a public fixture key and issuer to the test profile, plus the fixture key
  to the separately invoked read-only Supabase tests, which do not use that profile.
  These keys are for tests only. No real environment file or secret was read or edited.

## Validation

- Attempted `./gradlew compileKotlin --no-daemon`; the wrapper failed before
  compilation because its cache lock under `/home/austin/.gradle` is read-only in
  this session. Compilation remains unverified.
- `git diff --check` passed.
- Statically confirmed the shared public fixture key decodes to 32 bytes.

## Remaining work and boundaries

Focused tests for token issuance, claims, invalid signatures, wrong issuer, and
expiration are the next chunk. These components are not yet wired into route
security or a login endpoint. Resource Server filters, CORS, `/me`, Expo login,
and user-role authority conversion remain later work. No schema or existing
Markdown documentation was changed; only this new log was added under `aiDocs/`.
