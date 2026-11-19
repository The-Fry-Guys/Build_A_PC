/** Minimal SDK boundary keeps native behavior testable without Google or an emulator. */
export interface NativeGoogleSdk {
  configure(options: { webClientId: string; offlineAccess: boolean }): void;
  hasPlayServices(options: { showPlayServicesUpdateDialog: boolean }): Promise<boolean>;
  signIn(): Promise<{ type: string; data?: { idToken: string | null } | null }>;
  signOut(): Promise<unknown>;
}

export interface NativeGoogleAuth {
  signIn(): Promise<string | null>;
  signOut(): Promise<void>;
}

class GoogleSetupError extends Error {}

/** Serializes SDK operations so logout also clears an outstanding native sign-in. */
export function createNativeGoogleAuth(
  sdk: NativeGoogleSdk,
  getClientId: () => string | undefined,
  codes: { SIGN_IN_CANCELLED: string; IN_PROGRESS: string; PLAY_SERVICES_NOT_AVAILABLE: string },
): NativeGoogleAuth {
  let configured = false;
  let busy = false;
  let operations: Promise<unknown> = Promise.resolve();
  function queue<T>(operation: () => Promise<T>): Promise<T> {
    const next = operations.then(operation);
    operations = next.catch(() => undefined);
    return next;
  }
  return {
    async signIn() {
      if (busy) throw new Error('Google sign-in is already in progress.');
      busy = true;
      try {
        return await queue(async () => {
          const clientId = getClientId()?.trim();
          if (!clientId) throw new GoogleSetupError('Google web client ID is not configured.');
          if (!configured) {
            sdk.configure({ webClientId: clientId, offlineAccess: false });
            configured = true;
          }
          if (!await sdk.hasPlayServices({ showPlayServicesUpdateDialog: true })) {
            throw new GoogleSetupError('Google Play Services is unavailable. Update it or use a Google Play emulator.');
          }
          const result = await sdk.signIn();
          if (result.type === 'cancelled') return null;
          const token = result.data?.idToken;
          if (result.type !== 'success' || !token?.trim()) {
            throw new GoogleSetupError('Google did not return an ID token. Check the Web client ID.');
          }
          return token;
        });
      } catch (error) {
        const code = String((error as { code?: unknown } | null)?.code ?? '');
        if (code === codes.SIGN_IN_CANCELLED) return null;
        if (code === codes.IN_PROGRESS) throw new Error('Google sign-in is already in progress.');
        if (code === codes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services is unavailable. Update it or use a Google Play emulator.');
        }
        if (code === '10' || code === 'DEVELOPER_ERROR') {
          throw new Error('Google Android configuration does not match this build. Check the package, signing SHA-1, and Web client ID.');
        }
        // Only our own errors are displayed. Never expose provider responses or tokens.
        if (error instanceof GoogleSetupError) throw error;
        throw new Error('Google sign-in could not start. Retry or rebuild the app with native Google Sign-In.');
      } finally {
        busy = false;
      }
    },
    async signOut() {
      await queue(async () => {
        if (!configured) {
          const clientId = getClientId()?.trim();
          if (!clientId) return;
          sdk.configure({ webClientId: clientId, offlineAccess: false });
          configured = true;
        }
        await sdk.signOut();
      });
    },
  };
}
