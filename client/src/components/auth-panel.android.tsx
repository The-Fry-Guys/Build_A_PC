import { ActivityIndicator, Button, View } from 'react-native';
import { useAndroidGitHub } from '@/auth/github-context';
import { useSession } from '@/auth/session-provider';
import GitHubLogin from './github-login';
import { ThemedText } from './themed-text';

export default function AuthPanel() {
  const { user, loading, error, retry, logout } = useSession();
  const { pending } = useAndroidGitHub();
  const busy = loading || pending;
  return <View style={{ gap: 12, paddingVertical: 16 }}>
    {busy && <ActivityIndicator accessibilityLabel="Loading session" />}
    {error && <View style={{ gap: 8 }}>
      <ThemedText accessibilityRole="alert">{error}</ThemedText>
      <Button title="Retry session" onPress={() => { void retry(); }} disabled={busy} />
      <Button title="Clear session / log out" onPress={() => { void logout(); }} disabled={busy} />
    </View>}
    {user ? <View style={{ gap: 8 }}>
      <ThemedText>Signed in as {user.display_name ?? user.email}</ThemedText>
      <ThemedText>{user.email}</ThemedText>
      <Button title="Log out" onPress={() => { void logout(); }} disabled={busy} />
    </View> : <View style={loading ? { display: 'none' } : undefined}><GitHubLogin /></View>}
  </View>;
}
