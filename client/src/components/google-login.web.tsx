import * as AuthSession from 'expo-auth-session';
import { useMemo, useState } from 'react';
import { Button, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { createGoogleAttempt } from '@/lib/google-flow';
import { ThemedText } from './themed-text';

const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
};

function Attempt({
  onFinish,
  onError,
}: {
  onFinish: () => void;
  onError: (message: string) => void;
}) {
  const { loginGoogle } = useSession();
  const [busy, setBusy] = useState(false);
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const redirectUri = AuthSession.makeRedirectUri({ path: 'auth' });

  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '',
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    scopes: ['openid', 'email', 'profile'],
  }, discovery);

  const run = useMemo(
    () => request
      ? createGoogleAttempt(
          request,
          redirectUri,
          () => promptAsync(),
          loginGoogle,
        )
      : null,
    [request, redirectUri, promptAsync, loginGoogle],
  );

  return (
    <Button
      title={busy ? 'Signing in with Google…' : 'Sign in with Google'}
      disabled={!clientId || !run || busy}
      onPress={() => {
        if (!run || busy) return;

        setBusy(true);
        onError('');

        // Start directly from the click so the browser permits the popup.
        void run()
          .catch((error: unknown) => {
            onError(
              error instanceof Error
                ? error.message
                : 'Could not start Google sign-in.',
            );
          })
          .finally(onFinish);
      }}
    />
  );
}

/** Starts Google web login and prepares a fresh request after each attempt. */
export default function GoogleLogin() {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');

  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) {
    return <ThemedText>Google web client ID is not configured.</ThemedText>;
  }

  return (
    <View style={{ gap: 8 }}>
      {error ? (
        <ThemedText accessibilityRole="alert">{error}</ThemedText>
      ) : null}

      <Attempt
        key={attempt}
        onError={setError}
        onFinish={() => setAttempt((value) => value + 1)}
      />
    </View>
  );
}
