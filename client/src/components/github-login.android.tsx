import { Button, View } from 'react-native';
import { useAndroidGitHub } from '@/auth/github-context';
import { ThemedText } from './themed-text';

export default function GitHubLogin({ disabled = false }: { disabled?: boolean }) {
  const { ready, pending, error, start } = useAndroidGitHub();
  return <View style={{ gap: 12 }}>
    {error && <ThemedText accessibilityRole="alert">{error}</ThemedText>}
    <Button title={pending ? 'Signing inâ€¦' : 'Sign in with GitHub'}
      disabled={disabled || !ready || pending} onPress={start} />
  </View>;
}
