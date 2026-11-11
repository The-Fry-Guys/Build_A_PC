import AppTabs from '@/components/app-tabs';
import { useSession } from '@/auth/session-provider';
import { ActivityIndicator, View } from 'react-native';

/** Waits for session restoration before resolving protected native tab links. */
export default function TabsLayout() {
  const { loading } = useSession();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading session" /></View>;
  return <AppTabs />;
}
