import AppTabs from '@/components/app-tabs';
import { Redirect, Slot, usePathname } from 'expo-router';
import { useSession } from '@/auth/session-provider';
import { ActivityIndicator, View } from 'react-native';
import { BuildProvider } from '@/hooks/build-context';

/** Waits for session restoration before resolving protected native tab links. */
export default function TabsLayout() {
  const { loading, user } = useSession();
  const pathname = usePathname();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading session" /></View>;
  if (!user) {
    return pathname === '/' ? <Slot /> : <Redirect href="/" />;
  }
  return <BuildProvider><AppTabs /></BuildProvider>;
}
