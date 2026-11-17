import React, { useEffect, useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useBuild } from '@/hooks/useBuild';
import { getSavedBuild, getSavedBuilds } from '@/lib/api';

const PAGE_SIZE = 20;

/** Lists the signed-in user's saved builds and loads selected builds for editing. */
export default function SavedBuilds() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { loadBuild } = useBuild();
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editError, setEditError] = useState('');

    useEffect(() => {
        const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPage(0); }, 250);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    const builds = useQuery({
        queryKey: ['saved-builds', search, page],
        queryFn: ({ signal }) => getSavedBuilds({ q: search, page, size: PAGE_SIZE, signal }),
        staleTime: 30_000,
    });

    /** Loads one saved build's parts and routes back to the active builder. */
    const editBuild = async (id: string) => {
        setEditingId(id);
        setEditError('');
        try {
            const detail = await queryClient.fetchQuery({
                queryKey: ['saved-build', id],
                queryFn: () => getSavedBuild(id),
            });
            loadBuild(detail.id, detail.name, detail.budget, detail.parts.map((part) => ({
                part_id: part.part_id,
                category: part.category,
                name: part.name,
                price: part.price,
                created_at: part.created_at,
                quantity: part.quantity,
            })));
            router.push('/alex-pc' as Href);
        } catch (error) {
            setEditError(error instanceof Error ? error.message : 'Could not load this build.');
        } finally {
            setEditingId(null);
        }
    };

    const pageData = builds.data;
    return <View style={styles.container}>
        <Text style={styles.title}>Saved Builds</Text>
        <TextInput accessibilityLabel="Search builds" placeholder="Search builds by name" placeholderTextColor="#737373"
            value={searchInput} onChangeText={setSearchInput} style={styles.search} returnKeyType="search" />
        {editError ? <Text accessibilityRole="alert" style={styles.error}>{editError}</Text> : null}
        {builds.isLoading ? <View style={styles.centered}><ActivityIndicator size="large" color="#1976d2" /><Text style={styles.status}>Loading builds…</Text></View>
            : builds.isError ? <View style={styles.centered}>
                <Text accessibilityRole="alert" style={styles.error}>{builds.error.message}</Text>
                <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => { void builds.refetch(); }}><Text style={styles.buttonText}>Retry</Text></TouchableOpacity>
            </View>
                : <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {pageData?.content.map((build) => <View key={build.build_id} style={styles.card}>
                        <Text style={styles.buildName}>{build.name}</Text>
                        <Text style={styles.detail}>Budget: {build.budget === null ? 'Not set' : `$${build.budget.toFixed(2)}`}</Text>
                        <Text style={styles.detail}>Price: ${build.total_price.toFixed(2)}</Text>
                        <Text style={styles.detail}>Compatibility score: <Text style={styles.notImplemented}>not implemented yet</Text></Text>
                        <TouchableOpacity accessibilityRole="button" disabled={editingId !== null} style={styles.button} onPress={() => { void editBuild(build.build_id); }}>
                            <Text style={styles.buttonText}>{editingId === build.build_id ? 'Loading…' : 'Edit Build'}</Text>
                        </TouchableOpacity>
                    </View>)}
                    {pageData?.content.length === 0 && <Text style={styles.status}>{search ? 'No builds match that search.' : 'No saved builds yet. Finalize one from My Build.'}</Text>}
                </ScrollView>}
        <View style={styles.pagination}>
            <TouchableOpacity accessibilityRole="button" disabled={page === 0 || builds.isFetching} style={[styles.pageButton, (page === 0 || builds.isFetching) && styles.disabled]}
                onPress={() => setPage((current) => Math.max(0, current - 1))}><Text style={styles.pageText}>Previous</Text></TouchableOpacity>
            <Text style={styles.pageText}>Page {pageData?.totalPages ? page + 1 : 0} of {pageData?.totalPages ?? 0}</Text>
            <TouchableOpacity accessibilityRole="button" disabled={!pageData || page + 1 >= pageData.totalPages || builds.isFetching}
                style={[styles.pageButton, (!pageData || page + 1 >= pageData.totalPages || builds.isFetching) && styles.disabled]}
                onPress={() => setPage((current) => current + 1)}><Text style={styles.pageText}>Next</Text></TouchableOpacity>
        </View>
    </View>;
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 0, width: '100%', backgroundColor: '#f5f5f5', padding: 16, gap: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#171717' },
    search: { borderWidth: 1, borderColor: '#c7c7c7', borderRadius: 8, backgroundColor: '#fff', color: '#171717', paddingHorizontal: 12, paddingVertical: 10 },
    list: { flex: 1, minHeight: 0 },
    listContent: { gap: 12, paddingBottom: 16 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, gap: 8, elevation: 2 },
    buildName: { fontSize: 18, fontWeight: 'bold', color: '#171717' },
    detail: { fontSize: 15, color: '#414141' },
    notImplemented: { color: '#666', fontStyle: 'italic' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
    status: { color: '#555', textAlign: 'center', padding: 20 },
    error: { color: '#b42318', textAlign: 'center' },
    button: { backgroundColor: '#1976d2', padding: 12, borderRadius: 6, alignItems: 'center', marginTop: 4 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    pagination: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingBottom: 84 },
    pageButton: { backgroundColor: '#e5e7eb', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8 },
    pageText: { color: '#253044' },
    disabled: { opacity: 0.45 },
});
