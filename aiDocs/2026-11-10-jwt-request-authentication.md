# JWT request authentication and current-user endpoint

Date: 2026-11-10

## Changes

- Added Spring Boot's security OAuth2 Resource Server starter.
- Updated `SecurityConfig` to use stateless Bearer-token authentication with the
  existing JWT decoder. Both authorization and Resource Server failure paths use
  our Problem Details responses; 401 includes `WWW-Authenticate: Bearer`.
- Kept API information, health, docs, GitHub POST login, and GET catalog routes
  public. Admin routes and non-GET catalog requests require ADMIN. Current-user,
  user, and build namespaces require authentication.
- Unmatched routes remain permitted to reach MVC for existing 404/405 behavior.
  New private endpoints outside the guarded namespaces require explicit rules.
- JWT `roles` values are converted to Spring `ROLE_` authorities. This does not
  implement ownership checks or database-backed revalidation of admin roles.
- Added `MeController` implementing `GET /api/v1/me`: obtain the authenticated
  JWT subject, parse its UUID, read the current database user, and return the existing
  public user DTO with `Cache-Control: no-store`. Missing/invalid subjects or missing
  accounts return 401 through existing advice. Database failures remain unexpected
  server errors rather than being mislabeled as authentication failures.
- Added mocked JwtDecoder beans to the two existing MVC slices that explicitly
  import SecurityConfig: API error-contract and health-outage tests.

## Validation

- Attempted `./gradlew compileKotlin test --no-daemon`; the wrapper failed before
  compilation because its cache lock under `/home/austin/.gradle` is read-only in
  this session. Compilation and suite execution remain unverified here.
- `git diff --check` passed.
- Static inspection confirmed the resource-server dependency and both decoder
  mocks were added once, and the real decoder is passed to the security filter.

## Boundaries

Dedicated JWT HTTP authentication/role/current-user tests and CORS are the next
chunks. No hosted database, environment file, schema, Expo screen, ownership logic,
or existing Markdown documentation was changed. This file is the new `aiDocs/` log.
