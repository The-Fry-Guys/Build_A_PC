import * as AuthSession from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { createGitHubAttempt } from '@/lib/github-flow';
import { AndroidGitHubContext } from './github-context';
import { useSession } from './session-provider';

const discovery = { authorizationEndpoint: 'https://github.com/login/oauth/authorize' };
type PreparedAttempt = () => Promise<void>;

/** A headless request owner survives navigation to the deep-link callback. */
function AndroidRequest({ clientId, onReady }: {
  clientId: string;
  onReady: (attempt: PreparedAttempt | null) => void;
}) {
  const { login } = useSession();
  const redirectUri = AuthSession.makeRedirectUri({ native: 'client://auth', scheme: 'client', path: 'auth' });
  const [request, , promptAsync] = AuthSession.useAuthRequest({
    clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
    scopes: ['user:email'],
  }, discovery);
  const attempt = useMemo(() => request
    ? createGitHubAttempt(request, redirectUri, () => promptAsync(), login)
    : null, [request, redirectUri, promptAsync, login]);

  useEffect(() => {
    onReady(attempt);
    return () => onReady(null);
  }, [attempt, onReady]);
  return null;
}

export default function GitHubProvider({ children }: PropsWithChildren) {
  const router = useRouter();
  const clientId = process.env.EXPO_PUBLIC_GITHUB_ANDROID_CLIENT_ID?.trim();
  const [version, setVersion] = useState(0);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prepared = useRef<PreparedAttempt | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const register = useCallback((attempt: PreparedAttempt | null) => {
    if (busy.current) return;
    prepared.current = attempt;
    setReady(attempt !== null);
  }, []);

  const start = () => {
    const attempt = prepared.current;
    if (!attempt || busy.current) return;
    busy.current = true;
    prepared.current = null;
    setReady(false);
    setPending(true);
    setError(null);
    void attempt().catch((failure: unknown) => {
      if (mounted.current) {
        setError(failure instanceof Error ? failure.message : 'Could not sign in with GitHub.');
      }
    }).finally(() => {
      if (!mounted.current) return;
      busy.current = false;
      setPending(false);
      // Remount just the request, keeping the session and navigation alive.
      setVersion((value) => value + 1);
      router.replace('/');
    });
  };

  return <AndroidGitHubContext.Provider value={{
    ready,
    pending,
    error: clientId ? error : 'GitHub Android client ID is not configured.',
    start,
  }}>
    {clientId && <AndroidRequest key={version} clientId={clientId} onReady={register} />}
    {children}
  </AndroidGitHubContext.Provider>;
}
