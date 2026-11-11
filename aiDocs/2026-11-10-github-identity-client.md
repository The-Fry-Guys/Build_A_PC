# GitHub identity exchange client

Date: 2026-11-10

## Changes

- Added the Spring Boot RestClient starter to `api/build.gradle`.
- Extended `GitHubOAuthConfiguration` with a qualified `githubRestClient` bean
  using Boot's configured message converters, a five-second connection timeout,
  a ten-second read timeout, a User-Agent, and no automatic redirect following.
- Added internal response classes in `GitHubResponses.kt` for token, user, and
  email JSON. They ignore unrelated fields and do not generate data-class string
  representations containing provider tokens.
- Added `GitHubIdentityClient.exchange(code, codeVerifier, redirectUri)`. It first
  uses the existing callback resolver, validates nonblank code and PKCE verifier
  syntax, then posts a form to GitHub's token endpoint with the server-owned client
  secret and the original redirect URI. It explicitly requests JSON.
- The client fetches `/user` and `/user/emails` using the provider token, requires
  a positive stable user ID and a verified primary nonblank email, and returns
  `ProviderIdentity`. Display name falls back to GitHub login. The provider token
  is not returned or persisted.
- A `bad_verification_code` OAuth response becomes 400. Unverified-email rejection
  uses the existing exception/400 handler. Other OAuth errors, missing usable
  responses, and RestClient failures become sanitized 502 responses without the
  original provider response or exception cause. Configuration failures retain the
  resolver's existing behavior. No blanket database transaction wraps network I/O.

## Validation

- Attempted `./gradlew compileKotlin --no-daemon`; the Gradle wrapper could not open
  its cache lock under `/home/austin/.gradle` because it is read-only in this session.
  Compilation remains unverified.
- `git diff --check` passed.
- No live GitHub requests were made and no credential values were read. Simulated
  provider-response tests are the next chunk, before exposing the login endpoint.

## Boundaries

No account-service integration, JWT issuance, authentication endpoints, client login
screens, schema changes, or environment-file edits were included. Existing Markdown
documentation was not changed; this log is contained in `aiDocs/`.
