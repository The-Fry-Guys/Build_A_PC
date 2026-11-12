import { Redirect, useFocusEffect } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAdminDirectory, type DirectoryKind, type DirectoryRecord } from './use-admin-directory';

/** A shared accessible action with consistent web and touch targets. */
function AdminButton({ children, onPress, disabled = false, selected = false, label, expanded }: PropsWithChildren<{
  onPress: () => void; disabled?: boolean; selected?: boolean; label?: string; expanded?: boolean;
}>) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button"
    accessibilityLabel={label ?? (selected && typeof children === 'string' ? `${children} (current section)` : undefined)}
    accessibilityState={{ disabled, expanded }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement, opacity: disabled ? 0.55 : pressed ? 0.75 : 1 }]}>
    <ThemedText type="smallBold">{children}</ThemedText>
  </Pressable>;
}

/** Displays all approved fields while allowing compact rows to expand for inspection. */
function RecordRow({ record, wide }: { record: DirectoryRecord; wide: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const isUser = 'email' in record;
  const title = isUser ? record.display_name || record.email : record.name;
  const subtitle = isUser ? record.email : record.category;
  const summary = isUser ? record.role : record.price === null ? 'Price not available' : `Price: ${record.price.toFixed(2)}`;
  const detailsAction = expanded ? 'Hide details' : 'View details';
  const fields = isUser ? {
    ID: record.id, Email: record.email, 'Display name': record.display_name ?? 'Not provided', Role: record.role,
    Created: new Date(record.created_at).toLocaleString(),
  } : {
    ID: record.part_id, Name: record.name, Category: record.category,
    Price: record.price === null ? 'Not available' : String(record.price), Created: new Date(record.created_at).toLocaleString(),
  };
  return <ThemedView type="backgroundElement" style={styles.card}>
    <View style={[styles.record, wide && styles.wideRow]}>
      <View style={styles.recordTitle}>
        <ThemedText type="smallBold">{title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">{subtitle}</ThemedText>
      </View>
      <ThemedText type="small">{summary}</ThemedText>
      <AdminButton label={`${detailsAction} for ${title}`} expanded={expanded} onPress={() => setExpanded(!expanded)}>
        {detailsAction}
      </AdminButton>
    </View>
    {expanded && <View style={styles.details}>{Object.entries(fields).map(([label, value]) =>
      <ThemedText key={label} type="small" selectable>{label}: {value}</ThemedText>,
    )}</View>}
  </ThemedView>;
}

/** Shows bounded search results and retry, empty, and pagination states for either directory. */
function AdminDirectory({ kind }: { kind: DirectoryKind }) {
  const directory = useAdminDirectory(kind, true);
  const theme = useTheme();
  const wide = useWindowDimensions().width >= 768;
  const busy = directory.isFetching || directory.pendingSearch;
  const data = directory.data;
  const records = directory.error || directory.pendingSearch ? [] : data?.content ?? [];
  return <View style={styles.directory}>
    <ThemedText type="smallBold">Search {kind}</ThemedText>
    <TextInput accessibilityLabel={`Search ${kind}`} value={directory.text} onChangeText={directory.setText}
      placeholder={kind === 'users' ? 'Email, display name, or ID' : 'Part name, category, or ID'}
      placeholderTextColor={theme.textSecondary} autoCapitalize="none" autoCorrect={false}
      style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
    <View accessibilityLiveRegion="polite" style={styles.status}>
      {busy ? <ActivityIndicator accessibilityLabel={`Loading ${kind}`} /> :
        <ThemedText type="small">{data?.totalElements ?? 0} {kind} found</ThemedText>}
    </View>
    {directory.error && <View accessibilityRole="alert" style={styles.message}>
      <ThemedText>{directory.error.message}</ThemedText>
      <AdminButton onPress={() => { void directory.refetch(); }}>Retry results</AdminButton>
    </View>}
    <FlatList data={records} keyExtractor={(record) => 'email' in record ? record.id : record.part_id}
      renderItem={({ item }) => <RecordRow record={item} wide={wide} />}
      contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled"
      ListEmptyComponent={!busy && !directory.error ? <ThemedText>No {kind} found. Try another search.</ThemedText> : undefined} />
    <View style={styles.pagination}>
      <AdminButton disabled={busy || directory.page === 0} onPress={() => directory.setPage(directory.page - 1)}>Previous</AdminButton>
      <ThemedText type="small">Page {data?.totalPages ? directory.page + 1 : 0} of {data?.totalPages ?? 0}</ThemedText>
      <AdminButton disabled={busy || !data || directory.page + 1 >= data.totalPages}
        onPress={() => directory.setPage(directory.page + 1)}>Next</AdminButton>
    </View>
  </View>;
}

/** Guards the shared admin screen and refreshes permissions whenever navigation returns to it. */
export default function AdminScreen() {
  const { user, loading, refresh, logout } = useSession();
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<DirectoryKind>('users');
  useFocusEffect(useCallback(() => {
    let active = true;
    setReady(false);
    void refresh().finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, [refresh]));

  if (loading || !ready) return <ThemedView style={styles.loading}><ActivityIndicator accessibilityLabel="Checking admin access" /></ThemedView>;
  if (user?.role !== 'ADMIN') return <Redirect href="/" />;

  return <ThemedView style={styles.screen}>
    <Head><title>Admin tools | Build A PC</title></Head>
    <SafeAreaView style={styles.safeArea}>
    <View style={styles.heading}><ThemedText type="subtitle" accessibilityRole="header">Admin tools</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">View and search account and catalog information.</ThemedText></View>
    <View style={styles.sections}>
      <AdminButton selected={kind === 'users'} onPress={() => setKind('users')}>Users</AdminButton>
      <AdminButton selected={kind === 'parts'} onPress={() => setKind('parts')}>Parts</AdminButton>
      <AdminButton onPress={() => { void refresh(); }}>Refresh access</AdminButton>
      <AdminButton onPress={() => { void logout(); }}>Log out</AdminButton>
    </View>
    <AdminDirectory key={`${user.id}:${kind}`} kind={kind} />
  </SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: 1100, paddingHorizontal: 20, paddingTop: 88, paddingBottom: BottomTabInset + 24, gap: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { gap: 8 },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, minWidth: 80, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  directory: { flex: 1, gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48, fontSize: 16 },
  status: { minHeight: 28, justifyContent: 'center' },
  message: { gap: 8, paddingVertical: 12 },
  results: { gap: 12, paddingBottom: 12 },
  card: { borderRadius: 10 },
  record: { padding: 16, gap: 12, minHeight: 64 },
  wideRow: { flexDirection: 'row', alignItems: 'center' },
  recordTitle: { flex: 1, gap: 4 },
  details: { padding: 16, paddingTop: 0, gap: 6 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
