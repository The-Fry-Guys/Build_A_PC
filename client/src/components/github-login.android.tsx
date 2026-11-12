import { Button, View } from 'react-native';
import { useAndroidGitHub } from '@/auth/github-context';
import { ThemedText } from './themed-text';

export default function GitHubLogin() {
  const { ready, pending, error, start } = useAndroidGitHub();
  return <View style={{ gap: 12 }}>
    {error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
    <Button title={pending ? 'Signing in…' : 'Sign in with GitHub'}
      disabled={!ready || pending} onPress={start} />
  </View>;
}
