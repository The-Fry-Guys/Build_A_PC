import { Redirect, useFocusEffect } from 'expo-router';
import Head from 'expo-router/head';
import { useCallback, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/auth/session-provider';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { useAdminDirectory, type DirectoryKind, type DirectoryRecord } from './use-admin-directory';

const partCategories = new Set([
  'case-accessory', 'case-fan', 'case', 'cpu-cooler', 'cpu', 'external-hard-drive', 'fan-controller',
  'headphones', 'internal-hard-drive', 'keyboard', 'memory', 'monitor', 'motherboard', 'mouse',
  'optical-drive', 'os', 'power-supply', 'sound-card', 'speakers', 'thermal-paste', 'ups',
  'video-card', 'webcam', 'wired-network-card', 'wireless-network-card',
]);

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
function RecordRow({ record, wide, onEdit, onDelete, showDelete }: { record: DirectoryRecord; wide: boolean; onEdit: () => void; onDelete: () => void; showDelete: boolean }) {
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
      <AdminButton label={`Edit ${title}`} onPress={onEdit}>Edit</AdminButton>
      {showDelete && <AdminButton label={`Delete ${title}`} onPress={onDelete}>Delete</AdminButton>}
    </View>
    {expanded && <View style={styles.details}>{Object.entries(fields).map(([label, value]) =>
      <ThemedText key={label} type="small" selectable>{label}: {value}</ThemedText>,
    )}</View>}
  </ThemedView>;
}

/** Shows bounded search results and retry, empty, and pagination states for either directory. */
function AdminDirectory({ kind, currentUserId }: { kind: DirectoryKind; currentUserId: string }) {
  const directory = useAdminDirectory(kind, true);
  const theme = useTheme();
  const wide = useWindowDimensions().width >= 768;
  const busy = directory.isFetching || directory.pendingSearch;
  const data = directory.data;
  const records = directory.error || directory.pendingSearch ? [] : data?.content ?? [];
  const [editing, setEditing] = useState<DirectoryRecord | null>(null);
  const [creating, setCreating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [partName, setPartName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [formError, setFormError] = useState('');
  const mutations = directory.mutations;
  const saving = mutations.userUpdate.isPending || mutations.partCreate.isPending || mutations.partUpdate.isPending;
  const deleting = mutations.userDelete.isPending || mutations.partDelete.isPending;
  const mutationError = mutations.userUpdate.error ?? mutations.partCreate.error ?? mutations.partUpdate.error ?? mutations.userDelete.error ?? mutations.partDelete.error;
  const clearForm = () => { setEditing(null); setCreating(false); setFormError(''); };
  const startEdit = (record: DirectoryRecord) => {
    setEditing(record); setCreating(false); setFormError('');
    if ('email' in record) { setEmail(record.email); setDisplayName(record.display_name ?? ''); }
    else { setPartName(record.name); setCategory(record.category); setPrice(record.price === null ? '' : String(record.price)); }
  };
  const confirmDelete = (record: DirectoryRecord) => {
    const isUser = 'email' in record;
    const label = isUser ? record.email : record.name;
    const remove = () => { void (isUser ? mutations.userDelete.mutateAsync(record.id) : mutations.partDelete.mutateAsync(record.part_id)).catch(() => undefined); };
    const details = isUser
      ? `This also removes ${label}'s saved builds and linked sign-in identities. This cannot be undone.`
      : `This permanently removes ${label} from the catalog. Deletion is blocked while a saved build uses it. This cannot be undone.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(`Delete ${isUser ? 'user' : 'part'} “${label}”? ${details}`)) remove();
      return;
    }
    Alert.alert(`Delete ${isUser ? 'user' : 'part'}?`, details, [
      { text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: remove },
    ]);
  };
  const submit = async () => {
    setFormError('');
    try {
      if (kind === 'users') {
        const normalizedEmail = email.trim();
        const normalizedName = displayName.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) { setFormError('Enter a valid email address.'); return; }
        if (normalizedName.length > 255) { setFormError('Display name must be 255 characters or fewer.'); return; }
        if (!editing || !('email' in editing)) return;
        await mutations.userUpdate.mutateAsync({ id: editing.id, input: { email: normalizedEmail, displayName: normalizedName || null } });
      } else {
        const normalizedName = partName.trim(); const normalizedCategory = category.trim();
        if (!normalizedName || !normalizedCategory) { setFormError('Part name and category are required.'); return; }
        if (normalizedName.length > 255 || normalizedCategory.length > 80) { setFormError('Part name must be at most 255 characters and category at most 80.'); return; }
        if (!partCategories.has(normalizedCategory)) { setFormError('Enter a supported catalog category, such as memory or video-card.'); return; }
        if (price.trim() && !/^\d{1,8}(\.\d{1,2})?$/.test(price.trim())) { setFormError('Enter a price with up to 8 whole digits and 2 decimal places, or leave it blank.'); return; }
        const numericPrice = price.trim() === '' ? null : Number(price);
        const input = { name: normalizedName, category: normalizedCategory, price: numericPrice };
        if (creating) await mutations.partCreate.mutateAsync(input);
        else if (editing && !('email' in editing)) await mutations.partUpdate.mutateAsync({ id: editing.part_id, input });
      }
      clearForm();
    } catch { /* Mutation error is rendered below with its API message. */ }
  };
  return <View style={styles.directory}>
    <ThemedText type="smallBold">Search {kind}</ThemedText>
    <TextInput accessibilityLabel={`Search ${kind}`} value={directory.text} onChangeText={directory.setText}
      placeholder={kind === 'users' ? 'Email, display name, or ID' : 'Part name, category, or ID'}
      placeholderTextColor={theme.textSecondary} autoCapitalize="none" autoCorrect={false}
      style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
    {kind === 'parts' && <AdminButton onPress={() => { setEditing(null); setCreating(true); setFormError(''); setPartName(''); setCategory(''); setPrice(''); }}>Create part</AdminButton>}
    {(editing || creating) ? <View>
      <ThemedView type="backgroundElement" style={styles.form}>
      <ThemedText type="smallBold">{creating ? 'Create part' : kind === 'users' ? 'Edit user' : 'Edit part'}</ThemedText>
      {kind === 'users' ? <>
        <ThemedText type="small">Email</ThemedText>
        <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} maxLength={254} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
        <ThemedText type="small">Display name</ThemedText>
        <TextInput accessibilityLabel="Display name" value={displayName} onChangeText={setDisplayName} maxLength={255} placeholder="Optional display name" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
      </> : <>
        <ThemedText type="small">Part name</ThemedText>
        <TextInput accessibilityLabel="Part name" value={partName} onChangeText={setPartName} maxLength={255} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
        <ThemedText type="small">Category</ThemedText>
        <TextInput accessibilityLabel="Category" value={category} onChangeText={setCategory} maxLength={80} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
        <ThemedText type="small">Price (optional)</ThemedText>
        <TextInput accessibilityLabel="Price" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Leave blank if unavailable" placeholderTextColor={theme.textSecondary} style={[styles.input, { color: theme.text, borderColor: theme.textSecondary, backgroundColor: theme.background }]} />
      </>}
      {formError ? <ThemedText accessibilityRole="alert">{formError}</ThemedText> : null}
      <View style={styles.sections}><AdminButton disabled={saving} onPress={() => { void submit(); }}>{saving ? 'Saving…' : 'Save'}</AdminButton><AdminButton disabled={saving} onPress={clearForm}>Cancel</AdminButton></View>
      </ThemedView>
      {mutationError ? <View accessibilityRole="alert" style={styles.message}><ThemedText>{mutationError instanceof Error ? mutationError.message : String(mutationError)}</ThemedText></View> : null}
    </View> : <>
      {mutationError ? <View accessibilityRole="alert" style={styles.message}><ThemedText>{mutationError instanceof Error ? mutationError.message : String(mutationError)}</ThemedText></View> : null}
      {deleting && <ThemedText accessibilityLiveRegion="polite">Deleting…</ThemedText>}
      <View accessibilityLiveRegion="polite" style={styles.status}>
        {busy ? <ActivityIndicator accessibilityLabel={`Loading ${kind}`} /> :
          <ThemedText type="small">{data?.totalElements ?? 0} {kind} found</ThemedText>}
      </View>
      {directory.error && <View accessibilityRole="alert" style={styles.message}>
        <ThemedText>{directory.error.message}</ThemedText>
        <AdminButton onPress={() => { void directory.refetch(); }}>Retry results</AdminButton>
      </View>}
      <View style={styles.results}>
        {records.map((record) => <RecordRow key={'email' in record ? record.id : record.part_id} record={record} wide={wide}
          onEdit={() => startEdit(record)} onDelete={() => confirmDelete(record)} showDelete={!('email' in record && record.id === currentUserId)} />)}
        {!busy && !directory.error && records.length === 0 && <ThemedText>No {kind} found. Try another search.</ThemedText>}
      </View>
      <View style={styles.pagination}>
        <AdminButton disabled={busy || directory.page === 0} onPress={() => directory.setPage(directory.page - 1)}>Previous</AdminButton>
        <ThemedText type="small">Page {data?.totalPages ? directory.page + 1 : 0} of {data?.totalPages ?? 0}</ThemedText>
        <AdminButton disabled={busy || !data || directory.page + 1 >= data.totalPages}
          onPress={() => directory.setPage(directory.page + 1)}>Next</AdminButton>
      </View>
    </>}
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
    <ScrollView style={styles.pageScroll} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
    <View style={styles.heading}><ThemedText type="subtitle" accessibilityRole="header">Admin tools</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">View and search account and catalog information.</ThemedText></View>
    <View style={styles.sections}>
      <AdminButton selected={kind === 'users'} onPress={() => setKind('users')}>Users</AdminButton>
      <AdminButton selected={kind === 'parts'} onPress={() => setKind('parts')}>Parts</AdminButton>
      <AdminButton onPress={() => { void refresh(); }}>Refresh access</AdminButton>
      <AdminButton onPress={() => { void logout(); }}>Log out</AdminButton>
    </View>
    <AdminDirectory key={`${user.id}:${kind}`} kind={kind} currentUserId={user.id} />
    </ScrollView>
  </SafeAreaView></ThemedView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, alignItems: 'center' },
  safeArea: { flex: 1, minHeight: 0, width: '100%', maxWidth: 1100 },
  pageScroll: { flex: 1, minHeight: 0, width: '100%' },
  pageContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: BottomTabInset + 24, gap: 12 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { gap: 8 },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  button: { minHeight: 44, minWidth: 80, padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  directory: { width: '100%', gap: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, minHeight: 48, fontSize: 16 },
  status: { minHeight: 28, justifyContent: 'center' },
  message: { gap: 8, paddingVertical: 12 },
  results: { gap: 12, paddingBottom: 12 },
  card: { borderRadius: 10 },
  record: { padding: 16, gap: 12, minHeight: 64 },
  wideRow: { flexDirection: 'row', alignItems: 'center' },
  recordTitle: { flex: 1, gap: 4 },
  details: { padding: 16, paddingTop: 0, gap: 6 },
  form: { borderRadius: 10, padding: 16, gap: 8 },
  pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
