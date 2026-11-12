import { ActivityIndicator, Button, View } from 'react-native';
import { useSession } from '@/auth/session-provider';
import GitHubLogin from './github-login';
import { ThemedText } from './themed-text';

export default function AuthPanel() {
  const { user, loading, error, retry, logout } = useSession();
  return <View style={{ gap: 12, marginTop: 88 }}>
    {loading && <ActivityIndicator accessibilityLabel="Loading session" />}
    {error && <View>
      <ThemedText accessibilityRole="alert">{error}</ThemedText>
      <Button title="Retry session" onPress={() => { void retry(); }} disabled={loading} />
      <Button title="Clear session / log out" onPress={() => { void logout(); }} disabled={loading} />
    </View>}
    {user ? <View>
      <ThemedText>Signed in as {user.display_name ?? user.email}</ThemedText>
      <ThemedText>{user.email}</ThemedText>
      <Button title="Log out" onPress={() => { void logout(); }} disabled={loading} />
    </View> : <View style={loading ? { display: 'none' } : undefined}><GitHubLogin /></View>}
  </View>;
}
