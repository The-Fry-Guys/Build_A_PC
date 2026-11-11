# CORS configuration and preflight tests

Date: 2026-11-10

## Changes

- Added `AppCorsProperties` to bind the existing `app.cors.allowed-origins` setting.
  Explicit nonblank origins are required; wildcard and literal null origins are
  rejected. An empty list grants no cross-origin browser access.
- Added `AppCorsConfiguration` with an application-wide URL-based configuration
  source. It allows GET, HEAD, POST, PUT, PATCH, DELETE, and OPTIONS, and the
  Authorization/Content-Type request headers. Cookie credentials are disabled;
  browser preflight caching is set to one hour.
- Imported this configuration from `SecurityConfig` and explicitly selected its
  qualified configuration source in Spring Security's CORS integration. This lets
  preflight requests complete before JWT authentication without a blanket public
  OPTIONS authorization rule. Existing authorization rules were not changed.
- Added `CorsTests`, a MVC slice with the real security chain and a mocked decoder
  and user repository. Its nine invocations cover two configured origins, JSON
  login preflight, three rejected origins, rejected request headers, and retained
  CORS headers on authentication/authorization failures.

## Validation

- Attempted `./gradlew test --tests com.example.demo.CorsTests --no-daemon`.
  The wrapper failed before compilation because its cache lock under
  `/home/austin/.gradle` is read-only in this session. CORS tests remain unverified.
  The full suite was not retried because it uses the same blocked Gradle bootstrap.
- `git diff --check` passed.
- Static checks confirmed property-prefix alignment, the qualified bean/import,
  CORS integration before authentication processing, and all nine test invocations.

## Boundaries

No real environment files, secrets, schema, Expo screens, or existing Markdown
documentation were changed. CORS does not replace JWT authentication, ownership
checks, or role checks. These mock-based CORS tests do not contact GitHub or a
database. Expo login remains the next feature chunk.
