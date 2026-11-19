import { Link, Redirect, type Href } from 'expo-router';
import { ActivityIndicator, Button, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAndroidGitHub } from '@/auth/github-context';
import { useSession } from '@/auth/session-provider';
import GitHubLogin from '@/components/github-login';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/** Sign-in entry point; authenticated users start at the parts catalog. */
export default function HomeScreen() {
  const { user, error, retry, loading } = useSession();
  const { pending } = useAndroidGitHub();
  const busy = loading || pending;

  if (user) return <Redirect href={'/parts' as Href} />;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <ThemedText type="title">Build a PC</ThemedText>
          <ThemedText themeColor="textSecondary">
            Browse PC parts without signing in, or sign in with GitHub to manage your build.
          </ThemedText>
          {busy ? <ActivityIndicator accessibilityLabel="Loading session" /> : <GitHubLogin />}
          <Link href={'/parts' as Href}>Browse parts as a guest</Link>
          {error ? (
            <View style={styles.error}>
              <ThemedText accessibilityRole="alert">{error}</ThemedText>
              <Button title="Retry" onPress={() => { void retry(); }} disabled={busy} />
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, justifyContent: 'center', padding: Spacing.four },
  card: { gap: Spacing.three, alignItems: 'center', padding: Spacing.five },
  error: { gap: Spacing.two, alignItems: 'center' },
});
