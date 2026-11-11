# Standalone Android APK diagnostic attempt

## Goal

Test the existing GitHub callback flow on Pixel_9 using a release APK with its
JavaScript bundled, without Metro or the development launcher. Keep the OAuth
implementation, callback, signing configuration, and release network policy as-is.

## Actual results

- Ran from client/:

  ```sh
  rtk proxy npm run android:emulator -- --variant release --device Pixel_9 --no-build-cache
  ```

- Expo loaded the client environment and attempted device discovery. The sandbox
  prevented ADB from opening its local listener (`Operation not permitted`), so
  compilation, installation, and launch did not occur.
- Tried bypassing ADB with direct Gradle `app:assembleRelease`, setting the
  emulator API address and loading client/.env through Node. Gradle failed on its
  wrapper ZIP lock under ~/.gradle because that location is read-only here.
- Found the existing debug APK at
  client/android/app/build/outputs/apk/debug/app-debug.apk. This is not a
  standalone release artifact. **No new release APK was produced.**
- No OAuth, native project, cache, network-policy, or application-source changes
  were made. Only this new diagnostic log was added.

## Run locally

From client/, with Pixel_9 available:

```sh
rtk proxy npm run android:emulator -- --variant release --device Pixel_9 --no-build-cache
```

Expected artifact after a successful build:
client/android/app/build/outputs/apk/release/app-release.apk.
The generated project currently signs the diagnostic release with its debug
keystore. If installation reports a signing mismatch, inspect it before
uninstalling anything; uninstalling clears the saved app session.

After installation, stop Metro and confirm the app opens independently. Check
callback dispatch:

```sh
rtk proxy adb devices -l
rtk proxy adb -s PIXEL_SERIAL shell am start -W -a android.intent.action.VIEW -d 'client://auth' com.anonymous.client
```

Replace PIXEL_SERIAL with the Pixel's serial from adb devices. A direct callback
without pending sign-in should open the app's fallback screen. Then start a real
GitHub sign-in from Home and check whether it returns to the installed app.

The current release manifest does not enable cleartext HTTP; only the debug
manifest does. Consequently, a successful callback may be followed by a blocked
HTTP API request to 10.0.2.2. That is separate from callback dispatch. No network
policy was weakened for this test.

Compilation, installation, independent launch, real GitHub callback, and any
filtered runtime logs remain pending local verification. The previous automated
test results do not establish that this standalone build works.
