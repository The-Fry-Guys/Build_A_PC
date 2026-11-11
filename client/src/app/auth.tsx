import { Link } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemedText } from '@/components/themed-text';

export default function AuthCallback() {
  useEffect(() => {
    if (typeof window !== 'undefined') WebBrowser.maybeCompleteAuthSession();
  }, []);
  return <View style={{ padding: 32, gap: 16 }}>
    <ThemedText>Completing sign-in. If this page stays open, return home and try again.</ThemedText>
    <Link href="/">Return home</Link>
  </View>;
}
