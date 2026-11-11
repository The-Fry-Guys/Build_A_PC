# GitHub login endpoint

Date: 2026-11-10

## Changes

- Added `GitHubLoginRequest.kt` with nonblank code/callback validation and the
  existing PKCE verifier character/length rule. It uses camelCase JSON fields
  matching the agreed GitHub request contract.
- Added `AuthResponses.kt` containing `GitHubLoginResponse` and `AuthUserResponse`.
  Responses expose only the app JWT and approved account fields, retaining the
  contract's `display_name` and `created_at` names. No JPA entity or GitHub token
  is returned. Token-containing response and code-containing request are regular
  classes without generated data-class string representations.
- Added `GitHubAuthController` implementing `POST /api/v1/auth/github` with JSON
  request/response media types. It validates input, exchanges the GitHub code,
  calls the transactional account service, issues the app JWT, and maps the user
  to a response DTO. Existing advice handles propagated failures.
- Successful login responses set `Cache-Control: no-store` and `Pragma: no-cache`.
  There is no controller transaction; provider HTTP work precedes account persistence.

## Validation

- Attempted `./gradlew compileKotlin --no-daemon`; the wrapper failed before
  compilation because its cache lock under `/home/austin/.gradle` is read-only in
  this session. Compilation remains unverified here.
- `git diff --check` passed.

## Boundaries

Controller request/response and failure-isolation tests are the next chunk. No real
GitHub sign-in was attempted. JWT request filtering, `/me`, CORS, Expo login, and
schema changes were not included. Existing security configuration and Markdown
documentation remain untouched; only this log was added under `aiDocs/`.
