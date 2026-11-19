import type { NativeGoogleAuth } from './google-native-flow';

/** Web and iOS do not load the Android native module. */
export const nativeGoogle: NativeGoogleAuth = {
  async signIn() { throw new Error('Native Google sign-in is available on Android.'); },
  async signOut() {},
};
