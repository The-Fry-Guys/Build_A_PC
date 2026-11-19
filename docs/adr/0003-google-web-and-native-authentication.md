# ADR-0003: Separate Google web and Android credential flows

**Status:** Accepted  
**Date:** 2026-11-19  
**Deciders:** Austin Phipps (@auPhippsCSUMB)  
**Supersedes:** none  
**Related PR(s):** Not yet opened for `austin/googleOauth`; tracked by [PRD-1 / #3](https://github.com/The-Fry-Guys/Build_A_PC/issues/3).

## Context

The project auth appendix requires Google sign-in on web and Android while Spring Boot
verifies provider identities and issues the app JWT. Web code exchange is implemented;
Android needs native sign-in rather than a custom-scheme Google AuthSession flow.

## Options considered

| Option | Pros | Cons |
|---|---|---|
| Native Google Sign-In on Android; PKCE code exchange on web | Follows Appendix I; reuses account and JWT services | Requires a native rebuild and registration of each signing SHA-1 |
| AuthSession on both platforms | Similar client code | Google Android custom-scheme restrictions make this unsuitable |
| Authentication broker | Outsources provider integration | Changes the required architecture; the course treats it as a fallback with reduced auth credit |

## Decision

Use `@react-native-google-signin/google-signin` on Android with the existing Web client ID
and offline access disabled. `POST /api/v1/auth/google` accepts either native `{ idToken }`
or web `{ code, code_verifier, redirect_uri }`, rejecting incomplete or mixed credentials.

Both paths use the same Google verifier and account rules before issuing `{ token, user }`.
Verify signature, Google issuer, Web client audience, expiration, subject, and verified email.
Retain the existing 409 response for an email owned by another provider; do not auto-link.

## Consequences

- **Good:** Shared verification, persistence, and session behavior; only the app JWT is stored
  in SecureStore on Android or sessionStorage on web. Secrets remain on the API.
- **Bad:** Expo Go cannot load the native module. Native builds require Android tooling,
  Google Play Services, and a registered package/signing-key pair. Logout does not revoke
  an already issued app JWT before its expiry.
- **Follow-up:** Register the Windows/team signing keys, configure the Windows SDK, and verify
  real Android login, cancellation, restart, and logout. Automated tests cover credential
  validation, HTTP/database integration, and late-result/logout safeguards; device testing
  is still pending. See [setup](../../README.md#google-oauth--web-and-android) and
  [sequence diagrams](../auth-sequence.md).
