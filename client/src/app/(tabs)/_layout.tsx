import AppTabs from '@/components/app-tabs';
import { Redirect, Slot, usePathname } from 'expo-router';
import { useSession } from '@/auth/session-provider';
import { ActivityIndicator, View } from 'react-native';
import { BuildProvider } from '@/hooks/build-context';

/** Allows guests to browse the catalog while protecting account and build routes. */
export default function TabsLayout() {
  const { loading, user } = useSession();
  const pathname = usePathname();
  if (loading) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Loading session" /></View>;
  if (!user && pathname !== '/parts') {
    return pathname === '/' ? <Slot /> : <Redirect href="/" />;
  }
  return <BuildProvider key={user?.id ?? 'guest'}><AppTabs /></BuildProvider>;
}
