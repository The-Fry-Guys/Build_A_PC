# Android GitHub OAuth first implementation chunk

## Implemented

- Added an Android-only GitHub provider beneath SessionProvider and above the
  root Stack. A headless AuthSession request stays mounted when the app navigates
  to the callback, retaining the PKCE verifier. Only the request worker remounts
  after completion; navigation and the session remain mounted.
- Uses EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID, authorization code flow, S256 PKCE,
  generated state, user:email, and exactly client://auth. Reuses the existing
  one-use exchange helper and Session.login, so the original verifier/redirect
  reach Spring Boot and its returned app JWT is saved through SecureStore before
  `/me` verifies the session. No provider tokens or secrets are stored by the app.
- Added Android Home controls for sign-in, progress, account details, session
  retry, and logout. Immediate ref-based locking blocks repeated presses; each
  completed/canceled/failed attempt gets fresh state and verifier. Browser errors
  are shown; API errors remain in the existing session state.
- The callback route only completes a popup on web. Android shows progress while
  the provider finishes, then returns Home. Direct/stale/cold-start callbacks
  without a pending request show a return-Home fallback and never exchange a code.
  Interrupted browser sign-ins are not resumed after process death.
- Default provider is a passthrough on web/iOS; native login controls are selected
  through .android.tsx files. Existing web login and native iOS placeholders are
  preserved. The separate root app/ Android project is untouched.
- Added android:emulator and start:android:emulator scripts. A Node launcher sets
  EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1 for that process only, preserving
  client/.env and the working web URL.
- Expo install selected expo-dev-client ~58.0.18 using the installed SDK 58 map.
  Its package.json declaration was saved, but installation failed with EAI_AGAIN
  for registry.npmjs.org. **The dependency and lockfile update remain pending.**

## Verification results

- All 53 tests across 8 suites pass, including the existing web/hydration tests.
- Android DOM tests exercise the real provider/controls with mocked native APIs:
  configuration, exact redirect, successful exchange, callback navigation while
  pending, repeated presses, cancellation/fresh retry, mismatched state,
  missing configuration, browser error, and direct callback fallback. They do not
  run a real Android browser or verify native OS deep-link dispatch.
- SecureStore adapter tests cover read/write/delete, consistent key usage, and
  propagated failures. Existing session tests cover restoration, 401, logout,
  network failure, and late requests/writes.
- Measured core coverage: 97.84% statements, 88% branches, 100% functions/lines.
  Native storage is now included; full UI/provider coverage is not claimed.
- TypeScript passes. Expo lint exits successfully with 0 errors and 14
  require-import warnings in the DOM tests.
- Emulator launcher resolves the local Expo CLI successfully (`--help`).
- Existing generated client/android manifests already include the client scheme,
  INTERNET permission, singleTask activity, and debug-only cleartext HTTP access.
  They were inspected, not edited.
- Local environment checks confirmed Android server credentials and public ID
  are present, IDs match, and the server callback resolves to client://auth.
  No secret values were printed or changed. GitHub registration itself was not
  inspected and still needs confirmation during real-device verification.
- `adb devices -l` and `npm run android:emulator -- --no-bundler` were attempted.
  ADB cannot open its listener inside this sandbox (Operation not permitted),
  so the build stopped before compilation. No build/install/device-flow success
  is claimed. Generated coverage output was restored rather than committed.

## Finish locally

Keep Spring Boot running through `rtk proxy bash load_env.sh` from api/.
From client/, with Android SDK/emulator available:

```sh
rtk proxy npx expo install expo-dev-client
rtk proxy npx expo prebuild --platform android
rtk npm run android:emulator
```

Prebuild updates the existing generated native project through Expo plugins;
do not manually edit generated manifests or the separate app/ project. Commit
the regenerated package-lock.json with package.json. Expo Go is not supported
for this callback flow. Later starts without rebuilding can use:

```sh
rtk npm run start:android:emulator
```

The emulator scripts deliberately target 10.0.2.2. For a physical device, use the
host's reachable LAN API address with the ordinary Android launch command instead.

Confirm the Android GitHub OAuth App callback is exactly client://auth. Test:

1. Reach http://10.0.2.2:8080/api/v1/health from the emulator before sign-in.
2. Tap sign-in; inspect user:email, state, and S256 challenge in authorization.
3. Complete GitHub login, return to the app, and confirm account details and /me.
4. Restart the app; verify restoration from SecureStore. Log out and restart:
   confirm it stays signed out.
5. Sign in with the same GitHub account used on web; confirm the same user and
   identity rows are reused rather than duplicated.
6. Cancel/back out and retry, test an unavailable API, and open client://auth
   directly without pending authorization. Confirm useful recovery behavior.

Android build, real provider login, callback dispatch, and persistence on a real
device/emulator remain pending these local checks. No schema/backend contract,
Google login, iOS login, production deployment, or existing documentation changed.
