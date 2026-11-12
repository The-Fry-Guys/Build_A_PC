# Security threat model

This document records current controls and remaining work for the Expo web and Android
client, Spring Boot API, and PostgreSQL database. The intended architecture is described
in [architecture.md](architecture.md). Planned controls are not yet production protections.

## 1. Cross-user access (information disclosure / tampering)

**Threat:** A user attempts to list or delete another user's PC builds.

**Current controls:** [SecurityConfig.kt](../api/src/main/kotlin/com/example/demo/SecurityConfig.kt)
requires authentication for build routes. [PCBuildController.kt](../api/src/main/kotlin/com/example/demo/PCBuildController.kt)
scopes build listings to the authenticated user ID and checks ownership before deletion.
[PcBuildRoutesTests.kt](../api/src/test/kotlin/com/example/demo/PcBuildRoutesTests.kt)
checks anonymous access, listing isolation, and cross-user deletion.

**Remaining work:** These tests supply mock authentication. The API does not yet authenticate
real bearer tokens. Integrate verified authentication with application user IDs, then test
ownership using real issued tokens and cover each additional user-owned resource.

## 2. Token theft or replay (spoofing)

**Threat:** An attacker steals or reuses a user's access token to impersonate them.

**Current controls:** Build routes reject unauthenticated requests; see
[SecurityConfig.kt](../api/src/main/kotlin/com/example/demo/SecurityConfig.kt) and
[PcBuildRoutesTests.kt](../api/src/test/kotlin/com/example/demo/PcBuildRoutesTests.kt).
This does not prevent theft or replay of a valid token.

**Remaining work:** Implement and test Google and GitHub sign-in, short-lived API-issued
tokens, signature and claim validation, HTTPS, and platform-appropriate token storage.
Define and test a revocation or expiry strategy, and ensure credentials and tokens are
never written to logs. Test expired, invalid, and missing tokens.

## 3. Secret leakage (information disclosure)

**Threat:** Database credentials, OAuth secrets, or signing keys enter Git, logs, client
bundles, or container images.

**Current controls:** [application.properties](../api/src/main/resources/application.properties)
reads database credentials from environment variables. The API and client
[Docker ignore files](../api/.dockerignore) exclude local `.env` files; the
[client Docker ignore file](../client/.dockerignore) excludes `.env*`.
[ApiErrorContractTests.kt](../api/src/test/kotlin/com/example/demo/ApiErrorContractTests.kt)
checks that database failures do not expose connection details.

**Remaining work:** Configure gitleaks on every pull request, enable GitHub secret-scanning
push protection, review ignore patterns and image contents for all secret files, and
document secret rotation. Keep OAuth client secrets and signing keys on the API only;
`EXPO_PUBLIC_*` values are public.

## 4. Vulnerable dependencies (tampering / denial of service)

**Threat:** Vulnerable or compromised libraries, tools, or base images affect the app or API.

**Current controls:** The [Expo workflow](../.github/workflows/expo.yml) installs from the
npm lockfile and runs checks; the [Detekt workflow](../.github/workflows/detekt.yml)
reports Kotlin static-analysis findings. Static analysis and a lockfile do not replace
dependency vulnerability scanning.

**Remaining work:** Configure Dependabot for npm and Gradle with a pull-request limit,
review and merge dependency updates, and add dependency/image vulnerability scanning.
Review npm audit findings and upgrade compatible packages without blindly applying
breaking fixes.

## 5. Destructive admin actions (elevation of privilege / tampering)

**Threat:** A non-admin deletes or modifies users or catalog data, or an admin performs
an unauthorized destructive action.

**Current controls:** No admin authorization implementation is present in the current
API. [SecurityConfig.kt](../api/src/main/kotlin/com/example/demo/SecurityConfig.kt)
permits requests outside the build routes; this must not be treated as admin protection.

**Remaining work:** Implement server-side, database-backed admin authorization before
exposing admin endpoints. Add tests proving non-admins receive 403, authorized admins can
perform permitted actions, and role revocation takes effect. Record destructive actions
without logging secrets or unnecessary personal data.
