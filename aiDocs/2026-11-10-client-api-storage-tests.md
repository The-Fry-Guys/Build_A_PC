# Client API and web token-storage tests

Date: 2026-11-10

## Changes

- Added `client/jest.config.cjs` using jest-expo, TypeScript test discovery under
  `__tests__`, cleared mock call history, and 70% coverage thresholds for the API
  module and web token adapter. Native adapter and future auth hooks are not yet
  included in this initial coverage scope.
- Added npm `test` and `test:coverage` scripts.
- Added ten API tests covering exchange JSON and headers, no token on login,
  authenticated profile retrieval, missing token/configuration, Problem Details
  detail/title fallbacks, generic JSON/non-JSON HTTP errors, invalid successful JSON,
  and network failures. Fetch and storage are mocked; original globals/environment
  are restored after tests.
- Added four web-storage tests covering missing tokens, save/get/clear, safe server
  rendering behavior, and propagated storage failures using in-memory storage.
- Declared jest-expo ~58.0.14 (selected by Expo's installed SDK map), Jest ^30.0.0,
  and @types/jest ^30.0.0. The Expo SDK 58 jest-expo source supports Jest 30.

## Dependency installation and validation

- Attempted `npx expo install jest-expo jest @types/jest --dev`, disabling dotenv
  loading and using a temporary npm cache. Registry access failed with EAI_AGAIN.
  **Dependencies are declared but not installed; the lockfile still needs updating
  for these new dev dependencies on a networked machine.** Existing user changes
  to package-lock.json and app.json, including SecureStore installation, were kept.
- `npm test -- --runInBand` and `npm run test:coverage -- --runInBand` both failed
  because the Jest executable is unavailable. No tests or coverage thresholds have
  been verified here.
- TypeScript reported missing Jest globals/types due to the failed install, plus
  the pre-existing incompatible ref type at app-tabs.web.tsx:38.
- `expo lint` attempted installation of missing ESLint tooling. Its offline install
  failed with ENOTCACHED; unplanned eslint/eslint-config-expo manifest additions
  were removed. Lint remains unverified and no lint configuration was added.
- Jest configuration passed `node --check`; the two new tests passed TypeScript
  syntax transpilation checks. These checks do not replace typechecking or Jest.
- `git diff --check` passed.

## Finish verification locally

From `client/`, on a machine with npm registry access:

```bash
rtk proxy npx expo install jest-expo jest @types/jest --dev
rtk npm test -- --runInBand
rtk npm run test:coverage -- --runInBand
rtk proxy npx tsc --noEmit
rtk proxy npx expo lint
```

Commit the regenerated lockfile with the manifest. This chunk adds no production
behavior, login screens, routes, or external requests. Existing documentation was
not changed; this new log is under `aiDocs/`.
