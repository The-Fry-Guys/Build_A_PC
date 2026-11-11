# GitHub client resolver

Date: 2026-11-10

## Changes

- Added `GitHubClientResolver.kt` to select the server-owned web or Android client
  by an exact configured callback URI match, without trimming or partial matching.
- Blank configured callbacks are excluded. Unknown callbacks produce 400 via the
  existing framework exception handler. Duplicate nonblank callbacks or missing
  credentials for the selected client produce configuration errors handled as
  sanitized 500 responses. Error messages do not include credentials.
- Added `GitHubClientResolverTests.kt`: web selection, Android selection, four
  rejected callback variants, duplicate callbacks, and two missing-credential cases.
  These are direct unit tests using fake values, without Spring, Docker, or GitHub.

## Validation

- Attempted `./gradlew test --tests com.example.demo.GitHubClientResolverTests
  --no-daemon`. The wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. Tests remain unverified here.
- `git diff --check` passed.

No GitHub HTTP exchange, production routes, JWTs, environment-file changes, database
changes, or edits to documentation outside `aiDocs/` were included.
