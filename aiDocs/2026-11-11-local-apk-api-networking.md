# Local standalone APK API networking

## Changes

- Added app.config.js, preserving existing app.json configuration and registering
  a local Expo config plugin. APP_ANDROID_EMULATOR_HTTP=1 explicitly enables it;
  the flag is off by default and is not an EXPO_PUBLIC bundle setting.
- The plugin generates an Android network security XML resource with HTTP denied
  by default and allowed only for the exact host 10.0.2.2 (no subdomains). It
  references that resource from the main manifest only for the local test build.
  It refuses to replace an unrelated network security configuration.
- Disabled prebuilds remove only this plugin's manifest reference/resource. They
  retain existing debug usesCleartextTraffic behavior and unrelated resources.
- Added `android:emulator:apk`: prebuild with the local flag, build/install a
  release APK on Pixel_9, then prebuild with the flag disabled in a finally block.
  It sets EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1 for child processes,
  without rewriting client/.env or the web API address. Build errors still trigger
  cleanup; cleanup errors are reported and produce a nonzero exit status.
- Uses --no-clean during both prebuilds to preserve native outputs. The installed
  Expo SDK 58 CLI recreates native directories by default; the initial verification
  run regenerated the ignored client/android directory before this behavior was
  identified. Final commands reuse it. Any prior APK outputs from before that
  initial prebuild need rebuilding. Native source changes were made only by Expo.
- No OAuth callback, backend API, schema, or existing documentation was changed.

## Verification

- All 62 tests across 10 suites passed. Nine new tests cover XML policy, cleanup,
  unchanged debug behavior, unrelated policy/resource preservation, opt-in config,
  build command/environment, skipped build on prebuild failure, and cleanup after
  build failure.
- TypeScript passed. Expo lint passed with 0 errors and 18 require-import warnings
  in tests. `git diff --check` passed.
- Ran actual Expo prebuild with the flag enabled, inspected the generated XML and
  manifest, then prebuilt with the flag disabled. Verified the override/resource
  were removed and debug HTTP permission remained intact.
- Executed the complete new command. Local prebuild succeeded; Expo then failed
  to start ADB's listener because the sandbox prohibits it. Cleanup prebuild ran
  successfully. No new APK compilation/install or runtime verification is claimed.
- Could not reach localhost:8080/api/v1/health from this environment. This alone
  does not establish whether the user's local API is running; verify locally.

## Run locally

Start Spring Boot from api/ with the root environment loaded:

```sh
rtk proxy bash load_env.sh
```

Confirm host API/database readiness:

```sh
rtk proxy curl -i http://localhost:8080/api/v1/health
```

From client/:

```sh
rtk npm run android:emulator:apk
```

This targets Pixel_9 and installs a standalone release APK configured for the
local emulator API. Expected artifact after successful compilation:
client/android/app/build/outputs/apk/release/app-release.apk. Generated source
configuration is restored afterward; the already built/installed APK retains its
local-only exception. Use this command again whenever rebuilding that test APK.

If the command is forcibly terminated before cleanup, restore defaults before
any normal build:

```sh
rtk proxy env APP_ANDROID_EMULATOR_HTTP=0 npx expo prebuild --platform android --no-install --no-clean
```

Stop Metro to confirm the APK is standalone. Test emulator access to
http://10.0.2.2:8080/api/v1/health, GitHub authorization and return to app, successful
code exchange and /me, app restart/session restoration, and logout. Browser
connectivity checks reachability; the actual app test verifies its network policy.

Live APK inspection, API connectivity from the app, and complete login remain
pending local verification. The exception is for a local diagnostic APK only;
production uses HTTPS and physical devices need a reachable address other than
10.0.2.2. No existing APK was successfully rebuilt by this sandbox run.
