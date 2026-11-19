import { Link, Redirect, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAndroidGitHub } from '@/auth/github-context';
import { useSession } from '@/auth/session-provider';
import { ThemedText } from '@/components/themed-text';

/** Completes browser OAuth handoff and routes authenticated users to the catalog. */
export default function AuthCallback() {
  const { pending } = useAndroidGitHub();
  const { user, loading, error } = useSession();
  useEffect(() => {
    if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();
  }, []);
  if (!loading && user) return <Redirect href={'/parts' as Href} />;

  return (
    <View style={{ padding: 32, gap: 16 }}>
      {loading || pending ? (
        <>
          <ActivityIndicator accessibilityLabel="Completing GitHub sign-in" />
          <ThemedText>Completing GitHub sign-in…</ThemedText>
        </>
      ) : (
        <>
          {error ? <ThemedText accessibilityRole="alert">{error}</ThemedText> : null}
          <ThemedText>No sign-in is in progress. Return home to start again.</ThemedText>
          <Link href="/">Return to sign-in</Link>
        </>
      )}
    </View>
  );
}
