import { Button, View } from 'react-native';
import { useSession } from '@/auth/session-provider';
import { ThemedText } from './themed-text';

export default function GoogleLogin({ disabled = false }: { disabled?: boolean }) {
  const { loginGoogleAndroid, loading } = useSession();
  if (!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim()) {
    return <ThemedText>Google web client ID is not configured.</ThemedText>;
  }
  return <View>
    <Button title="Sign in with Google" disabled={disabled || loading}
      onPress={() => { void loginGoogleAndroid(); }} />
  </View>;
}
