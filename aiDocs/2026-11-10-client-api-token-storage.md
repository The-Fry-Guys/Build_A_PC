# Expo API and token-storage foundation

Date: 2026-11-10

## Changes

- Added `client/src/lib/tokenStore.types.ts` with asynchronous get/set/clear methods.
- Added native `tokenStore.ts` using Expo SecureStore and `tokenStore.web.ts` using
  tab-scoped browser sessionStorage. The web adapter guards against server rendering;
  storage failures propagate rather than silently reporting successful persistence.
- Added `client/src/lib/api.ts` with public account/login interfaces, ApiError,
  GitHub code exchange, and authenticated current-user retrieval. It reads the
  public API base URL lazily, strips trailing slashes, and attaches an app JWT only
  to authenticated requests. Login requests do not include an existing JWT.
- Requests omit cookie credentials. Problem Details messages are surfaced safely;
  non-JSON errors use a generic HTTP message, invalid successful JSON raises a
  client-side ApiError with status 502, and transport errors have a readable message.
- Token saving, logout, session restoration, and 401-driven cleanup remain the
  responsibility of the future auth hook. TypeScript interfaces do not validate
  successful JSON response shapes at runtime.
- Declared `expo-secure-store: ~58.0.2` using Expo's SDK 58 compatibility map through
  `expo install`. Installation did not finish because networking is unavailable.

## Validation and incomplete dependency installation

- Ran `npx expo install expo-secure-store` with a temporary npm cache and dotenv
  loading disabled. Expo selected ~58.0.2, but npm could not complete offline. The
  stalled installation was interrupted. **The package is not installed and
  package-lock.json has not been updated.** Finish installation on a networked machine:

  ```bash
  # From client/
  rtk proxy npx expo install expo-secure-store
  ```

- Full `npx tsc --noEmit` reported the missing SecureStore module and an existing
  incompatible ref type at `src/components/app-tabs.web.tsx:38`. The existing
  component was not changed in this chunk.
- An isolated TypeScript check passed for the new API, web storage, and storage
  interface using web module resolution and the project's Expo ambient types.
  Native storage still requires the missing dependency before it can be verified.
- Ran `npx expo lint`; the project has no ESLint configuration or installed tooling,
  so Expo attempted to install them. That stalled installation was interrupted,
  and its unplanned manifest changes for eslint/eslint-config-expo were removed.
  Lint remains unverified. No lint configuration was added.
- `git diff --check` passed.

After completing dependency installation, rerun TypeScript and lint checks. Review
and commit the regenerated package-lock.json with the dependency change; npm ci
cannot reproduce the new dependency until that lockfile is synchronized.

## Boundaries

No real environment files, secrets, screens, routes, OAuth requests, or backend code
were changed. Existing Markdown documentation was not edited. Web sessionStorage
is not encrypted and remains accessible to scripts running on the same origin.
Native integration/configuration and runtime verification will be revisited with
the Expo Android development build.
