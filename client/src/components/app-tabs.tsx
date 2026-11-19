import { Tabs, TabList, TabTrigger, TabSlot, type TabTriggerSlotProps, type TabListProps } from 'expo-router/ui';
import type { Href } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/auth/session-provider';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

/** Renders the shared floating route bar on Android and other native platforms. */
export default function AppTabs() {
  const { user } = useSession();
  return <Tabs style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative', overflow: 'hidden' }}>
    <TabSlot style={{ flex: 1, minHeight: 0, paddingBottom: 88, overflow: 'hidden' }} />
    <TabList asChild>
      <FloatingTabList>
        <TabTrigger name="index" href="/" asChild><TabButton hidden={!!user}>Sign in</TabButton></TabTrigger>
        <TabTrigger name="parts" href={'/parts' as Href} asChild><TabButton>Parts</TabButton></TabTrigger>
        <TabTrigger name="alex-pc" href={'/alex-pc' as Href} asChild><TabButton hidden={!user}>My Build</TabButton></TabTrigger>
        <TabTrigger name="builds" href={'/builds' as Href} asChild><TabButton hidden={!user}>Builds</TabButton></TabTrigger>
        <TabTrigger name="profile" href={'/profile' as Href} asChild><TabButton hidden={!user}>Profile</TabButton></TabTrigger>
        <TabTrigger name="admin" href="/admin" asChild><TabButton hidden={user?.role !== 'ADMIN'}>Admin</TabButton></TabTrigger>
      </FloatingTabList>
    </TabList>
  </Tabs>;
}

type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & Pick<ComponentProps<typeof Pressable>, 'ref'> & { hidden?: boolean };

/** Displays one navigation target and its selected state. */
function TabButton({ children, isFocused, hidden, ...props }: TabButtonProps) {
  return <Pressable {...props} accessibilityRole="link" style={({ pressed }) => [hidden && styles.hidden, pressed && styles.pressed]}>
    <ThemedView type={isFocused ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabButtonView}>
      <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>{children}</ThemedText>
    </ThemedView>
  </Pressable>;
}

/** Centers the floating navigation capsule above page content. */
function FloatingTabList(props: TabListProps) {
  return <View {...props} style={styles.tabListContainer}>
    <ThemedView type="backgroundElement" style={styles.innerContainer}>
      <ThemedText type="smallBold" style={styles.brandText}>Build a PC</ThemedText>
      {props.children}
    </ThemedView>
  </View>;
}

const styles = StyleSheet.create({
  tabListContainer: { position: 'absolute', width: '100%', bottom: 12, padding: Spacing.three, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', zIndex: 10 },
  innerContainer: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.five, borderRadius: Spacing.five, flexDirection: 'row', alignItems: 'center', flexGrow: 0, gap: Spacing.two, maxWidth: MaxContentWidth },
  brandText: { marginRight: 'auto' },
  tabButtonView: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.three, borderRadius: Spacing.three },
  hidden: { display: 'none' },
  pressed: { opacity: 0.7 },
});
