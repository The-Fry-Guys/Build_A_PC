# GitHub OAuth configuration binding

Date: 2026-11-10

## Changes

- Added `GitHubOAuthProperties.kt` to bind the existing `app.oauth.github` settings
  into separate web and Android client settings, each containing a client ID,
  client secret, and redirect URI.
- Used regular classes rather than data classes to avoid automatically including
  credential fields in generated `toString()` output.
- Added `GitHubOAuthConfiguration.kt` with `@EnableConfigurationProperties` to
  register the properties bean for later constructor injection.
- Kept blank defaults so unrelated tests can start without real credentials.
  The upcoming exchange client must validate the selected registration and reject
  unknown callbacks before performing provider requests.

## Validation

- Attempted `./gradlew compileKotlin --no-daemon` from `api/`; the wrapper failed
  before compilation because its lock file under `/home/austin/.gradle` is on a
  read-only filesystem in this session. Compilation remains unverified.
- `git diff --check` passed.

No environment files, property values, database schema, production endpoints,
GitHub HTTP calls, or JWT handling were changed. Documentation changes are limited
to this new file under `aiDocs/`.
