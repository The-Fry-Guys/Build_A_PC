# ADR 0003: Check GitHub popup wiring without provider login

Date: 2026-11-11

Status: Accepted

## Context

Appendix I requires a browser check of the GitHub authorization URL and PKCE.
Seeded app JWTs exercise private pages but cannot catch broken sign-in buttons.

## Decision

Add a separate Playwright test that clicks the real sign-in button, captures the
popup's GitHub request, checks callback/state/S256 parameters, and closes the popup.
Intercept the request before contacting GitHub. Use a synthetic public client ID,
no credentials, and assert cancellation performs no API exchange.

## Alternatives

- Full GitHub login: requires credentials and is vulnerable to MFA/bot checks.
- Only unit tests or seeded JWTs: cannot verify that the browser opens the popup.

## Consequences

This covers browser wiring, not real authentication or Android login. Keep manual
sign-in checks. This complements [ADR 0002](0002-admin-authorization-and-test-auth.md);
it does not supersede that decision. A genuine later decision superseding an ADR is
still needed for the project's supersession requirement.

Implementation: [test](../../client/e2e/auth.spec.ts) and
[configuration](../../client/playwright.config.ts).
