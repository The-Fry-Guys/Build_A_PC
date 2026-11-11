import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAndroidGitHub } from '@/auth/github-context';
import { ThemedText } from '@/components/themed-text';

export default function AuthCallback() {
  const { pending } = useAndroidGitHub();
  useEffect(() => {
    if (Platform.OS === 'web') WebBrowser.maybeCompleteAuthSession();
  }, []);
  return <View style={{ padding: 32, gap: 16 }}>
    {Platform.OS === 'android' ? <>
      {pending && <ActivityIndicator accessibilityLabel="Completing GitHub sign-in" />}
      <ThemedText>{pending ? 'Completing GitHub sign-in…' : 'No sign-in is in progress. Return home to start again.'}</ThemedText>
    </> : <ThemedText>Completing sign-in. If this page stays open, return home and try again.</ThemedText>}
    <Link href="/">Return home</Link>
  </View>;
}
