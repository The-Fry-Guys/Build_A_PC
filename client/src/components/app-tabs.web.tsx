import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from 'expo-router/ui';
import type { ComponentProps } from 'react';
import type { Href } from 'expo-router';
import { Pressable, View, StyleSheet } from 'react-native';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSession } from '@/auth/session-provider';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export default function AppTabs() {
  const { user } = useSession();
  return (
    <Tabs>
      <TabSlot style={{ height: '100%', paddingBottom: 88 }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="index" href="/" asChild>
            <TabButton hidden>Sign in</TabButton>
          </TabTrigger>
          <TabTrigger name="parts" href={'/parts' as Href} asChild>
            <TabButton>Parts</TabButton>
          </TabTrigger>
          <TabTrigger name="alex-pc" href={'/alex-pc' as Href} asChild>
            <TabButton>My Build</TabButton>
          </TabTrigger>
          <TabTrigger name="admin" href="/admin" asChild>
            <TabButton hidden={user?.role !== 'ADMIN'}>Admin</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// Router's slot ref uses the component type; Pressable expects its instance type.
type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & Pick<ComponentProps<typeof Pressable>, 'ref'> & { hidden?: boolean };

/** Renders a browser navigation link while keeping hidden admin links out of accessibility navigation. */
export function TabButton({ children, isFocused, hidden, ...props }: TabButtonProps) {
  return (
    <Pressable {...props} accessibilityRole="link" style={({ pressed }) => [hidden && { display: 'none' }, pressed && styles.pressed]}>
      <ThemedView
        type={isFocused ? 'backgroundSelected' : 'backgroundElement'}
        style={styles.tabButtonView}>
        <ThemedText type="small" themeColor={isFocused ? 'text' : 'textSecondary'}>
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        <ThemedText type="smallBold" style={styles.brandText}>
          Build a PC
        </ThemedText>

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabListContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 12,
    padding: Spacing.three,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.five,
    borderRadius: Spacing.five,
    flexDirection: 'row',
    alignItems: 'center',
    flexGrow: 0,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
  },
  brandText: {
    marginRight: 'auto',
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
});
