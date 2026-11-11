# ADR 0002: Current database roles and isolated admin test authentication

Date: 2026-11-11

Status: Accepted

## Context

PRD-6 needs private user search on web and Android. The project prompt requires server-side
admin enforcement and a demonstration that revoking the role produces 403. The auth implementation
copies roles into a one-hour app JWT, so claim-only authorization can outlive database demotion.
Browser acceptance tests also need authenticated accounts without driving OAuth provider pages.

## Decision

Keep the existing `users.role` schema and default `USER`. Resolve a validated JWT's `sub` to a
current database user for privileged requests. Grant access only when that record is `ADMIN`,
with no role caching. Missing accounts and unavailable permission data fail closed. This adds
one bounded primary-key lookup per privileged request and makes revocation immediate.

Use the existing shared API/session interfaces and public parts route. Private user responses
are non-cacheable, and account-scoped client query caches are discarded on logout or lost access.

Follow Appendix I's e2e profile: issue real app JWTs only for seeded local identities. The local
compose stack is disposable; startup guards reject production profiles and hosted databases.
Production uses neither this profile nor its public fixture key. Tests assert that the hook is
absent outside e2e and exercise production-guard rejection.

The web fixture token uses **sessionStorage**, matching the existing auth client, rather than
adding a second storage mechanism. This keeps the auth branch's token-storage policy unchanged.

## Alternatives

- JWT role checks alone: simple, but an already-issued token retains admin access until expiry.
- A new `is_admin` column: duplicates the existing role and introduces synchronization problems.
- A database role constraint: optional validation that adds schema work without replacing API checks;
  deferred for this feature.
- Real provider login in CI: unreliable under consent screens, MFA, and bot detection.
- Mock OIDC server: adds a server and provider behavior unrelated to this API's issued JWTs.
- A second dev signing key: tests a different token-verification path from the running API.

## Consequences

The API depends on database availability for admin permission decisions. OAuth remains owned by
the auth implementation, including the pending Android sign-in flow. The test-only profile must
remain isolated and must never be enabled in production. Coverage and acceptance-test results
remain pending reviewer execution; the author was instructed not to execute tests.
