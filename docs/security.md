# Security

Scope: GitHub web/Android, Google web, app JWTs, builds, and read-only admin tools.
Google Android and account deletion remain planned.

| Threat | Mitigation and evidence |
| --- | --- |
| Access to another user's build (IDOR) | The API checks ownership. [Controller tests](../api/src/test/kotlin/com/example/demo/PCBuildControllerTest.kt) cover denial. Database-backed build persistence still needs verification. |
| Token theft or replay | One-hour JWT expiry; Android SecureStore; web sessionStorage cleared on logout. [Token tests](../api/src/test/kotlin/com/example/demo/AppTokenServiceTests.kt), [web storage](../client/src/lib/tokenStore.web.ts). JavaScript can read sessionStorage, so XSS remains a risk. Logout does not revoke stolen JWTs before expiry. |
| Leaked credentials | API-only secrets; environment files excluded from Git and Docker builds. [Git ignores](../.gitignore), [Docker ignores](../.dockerignore). Automated secret scanning and repository push protection still need confirmation. |
| Vulnerable dependencies | Commit lockfiles and review updates. [Dependabot](../.github/dependabot.yml) checks Gradle (`/api`) and npm (`/client`) weekly, with up to five open update PRs per ecosystem. The 2026-11-16 local audit reports 22 moderate transitive findings involving glob/minimatch; remediation remains follow-up work. Reviewing and merging a Dependabot PR and an automated dependency/security gate remain outstanding. |
| Destructive administrator misuse | Check current database roles and fail closed. Current tools are read-only; only trusted database operators change roles. [Authorization tests](../api/src/test/kotlin/com/example/demo/DatabaseAdminAuthorizationTests.kt), [revocation tests](../api/src/test/kotlin/com/example/demo/AdminDirectoryIntegrationTests.kt). Future mutations need separate authorization and audit coverage. |

## Authentication boundaries

- Identify accounts by provider plus provider user ID, never email alone.
- Reject new identities with unverified email; return 409 for an already registered
  email, naming its original provider. No automatic linking.
  [Email rule tests](../api/src/test/kotlin/com/example/demo/AccountServiceTests.kt).
- PKCE and state protect both web providers. [Google popup tests](../client/src/lib/__tests__/google-login.web.test.ts)
  cover client wiring; real Google web login was checked locally.
- Google ID tokens require a valid signature, Google issuer, configured web-client
  audience, expiration, stable subject, and verified email. The Google verifier stays
  separate from the app-JWT decoder. [Verifier tests](../api/src/test/kotlin/com/example/demo/GoogleIdentityVerifierTests.kt).
- Enable fixture tokens only in isolated e2e. [Profile guard tests](../api/src/test/kotlin/com/example/demo/E2eProfileGuardTests.kt)
  verify production rejection. Never deploy the e2e profile or its public signing key.

Incident response: [runbook](runbook.md). Outstanding controls above are not claims
of completed implementation.
