import * as AuthSession from 'expo-auth-session';
import { useMemo, useState } from 'react';
import { Button, View } from 'react-native';

import { useSession } from '@/auth/session-provider';
import { createGitHubAttempt } from '@/lib/github-flow';
import { ThemedText } from './themed-text';

const discovery = { authorizationEndpoint: 'https://github.com/login/oauth/authorize' };

function Attempt({ onFinish, onError }: { onFinish: () => void; onError: (message: string) => void }) {
  const { login } = useSession();
  const [busy, setBusy] = useState(false);
  const clientId = process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID?.trim();
  const redirectUri = AuthSession.makeRedirectUri({ path: 'auth' });
  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId: clientId ?? '',
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    scopes: ['user:email'],
  }, discovery);
  const run = useMemo(() => request
    ? createGitHubAttempt(request, redirectUri, () => promptAsync(), login)
    : null, [request, redirectUri, promptAsync, login]);

  return <View>
    {!clientId && <ThemedText>GitHub web client ID is not configured.</ThemedText>}
    <Button title={busy ? 'Signing in…' : 'Sign in with GitHub'} disabled={!clientId || !run || busy}
      onPress={() => {
        if (!run || busy) return;
        setBusy(true);
        onError('');
        // Invoked directly from the click so the browser can open the popup.
        void run().catch((error: unknown) => {
          onError(error instanceof Error ? error.message : 'Could not start GitHub sign-in.');
        }).finally(onFinish);
      }} />
  </View>;
}

export default function GitHubLogin() {
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState('');
  if (!process.env.EXPO_PUBLIC_GITHUB_WEB_CLIENT_ID?.trim()) {
    return <ThemedText>GitHub web client ID is not configured.</ThemedText>;
  }
  return <View>
    {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
    <Attempt key={attempt} onError={setError} onFinish={() => setAttempt((value) => value + 1)} />
  </View>;
}
