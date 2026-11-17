import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getCatalogParts, type CatalogPart } from '@/lib/api';
import { useBuild } from '@/hooks/useBuild';
import type { Part } from '@/types/build';

const PAGE_SIZE = 100;

/** Loads every bounded API page so the local filters cover the full catalog. */
async function loadParts(signal: AbortSignal): Promise<CatalogPart[]> {
    const firstPage = await getCatalogParts({ q: '', page: 0, size: PAGE_SIZE, signal });
    const parts = [...firstPage.content];

    for (let page = 1; page < firstPage.totalPages; page += 1) {
        const result = await getCatalogParts({ q: '', page, size: PAGE_SIZE, signal });
        parts.push(...result.content);
    }

    return parts;
}

/** Displays a searchable, category-filtered catalog of public PC parts. */
export default function PartsCatalog() {
    const [parts, setParts] = useState<CatalogPart[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [addedPartId, setAddedPartId] = useState<string | null>(null);
    const requestController = useRef<AbortController | null>(null);
    const { addPart } = useBuild();

    const fetchParts = useCallback(async (signal: AbortSignal) => {
        setIsLoading(true);
        setError(null);
        try {
            setParts(await loadParts(signal));
        } catch {
            if (!signal.aborted) setError('Could not load parts catalog. Check your connection and try again.');
        } finally {
            if (!signal.aborted) setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        requestController.current = controller;
        void fetchParts(controller.signal);
        return () => {
            controller.abort();
            requestController.current = null;
        };
    }, [fetchParts]);

    const categories = useMemo(() => ['All', ...Array.from(new Set(parts.map((part) => part.category))).sort()], [parts]);
    const filteredParts = useMemo(() => {
        const query = search.trim().toLocaleLowerCase();
        return parts.filter((part) => (category === 'All' || part.category === category)
            && (!query || `${part.name} ${part.category}`.toLocaleLowerCase().includes(query)));
    }, [parts, category, search]);

    /** Adds the selected catalog entry to the shared active build. */
    const addToBuild = (catalogPart: CatalogPart) => {
        const part: Part = { ...catalogPart };
        addPart(part);
        setAddedPartId(catalogPart.part_id);
    };

    const renderPartCard = ({ item }: { item: CatalogPart }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.price}>{item.price == null ? 'Price unavailable' : `$${item.price.toFixed(2)}`}</Text>
            </View>
            <Text style={styles.name}>{item.name}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => addToBuild(item)}>
                <Text style={styles.addButtonText}>{addedPartId === item.part_id ? 'Added to Build' : 'Add to Build'}</Text>
            </TouchableOpacity>
        </View>
    );

    /** Restarts the catalog request and cancels any request already in flight. */
    const retry = () => {
        requestController.current?.abort();
        const controller = new AbortController();
        requestController.current = controller;
        void fetchParts(controller.signal);
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PC Parts Catalog</Text>
            <TextInput
                accessibilityLabel="Search parts"
                placeholder="Search parts"
                placeholderTextColor="#737373"
                value={search}
                onChangeText={setSearch}
                style={styles.search}
                returnKeyType="search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {categories.map((item) => (
                    <TouchableOpacity
                        key={item}
                        accessibilityRole="button"
                        accessibilityState={{ selected: category === item }}
                        onPress={() => setCategory(item)}
                        style={[styles.filter, category === item && styles.activeFilter]}
                    >
                        <Text style={[styles.filterText, category === item && styles.activeFilterText]}>{item}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {isLoading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#1976d2" /><Text style={styles.statusText}>Loading catalog...</Text></View>
            ) : error ? (
                <View style={styles.centered}><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryButton} onPress={retry}><Text style={styles.addButtonText}>Retry</Text></TouchableOpacity></View>
            ) : (
                <FlatList
                    data={filteredParts}
                    keyExtractor={(item) => item.part_id}
                    renderItem={renderPartCard}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={<Text style={styles.statusText}>No parts match those filters.</Text>}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#171717' },
    search: { borderWidth: 1, borderColor: '#c7c7c7', borderRadius: 8, backgroundColor: '#fff', color: '#171717', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    filters: { gap: 8, paddingBottom: 12 },
    filter: { borderWidth: 1, borderColor: '#b7c0cc', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
    activeFilter: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
    filterText: { color: '#253044', fontSize: 13 },
    activeFilterText: { color: '#fff', fontWeight: 'bold' },
    list: { paddingBottom: 24, flexGrow: 1 },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    price: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
    name: { fontSize: 18, marginBottom: 16, color: '#171717' },
    addButton: { backgroundColor: '#1976d2', padding: 10, borderRadius: 6, alignItems: 'center' },
    retryButton: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
    addButtonText: { color: '#fff', fontWeight: 'bold' },
    statusText: { marginTop: 12, color: '#555', textAlign: 'center' },
    errorText: { color: '#b42318', fontSize: 16, textAlign: 'center' },
});
