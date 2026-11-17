import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { getCatalogParts, type CatalogPart } from '@/lib/api';
import { useBuild } from '@/hooks/useBuild';
import type { Part } from '@/types/build';

const PAGE_SIZE = 20;
const CATEGORIES = [
    'case-accessory', 'case-fan', 'case', 'cpu-cooler', 'cpu', 'external-hard-drive',
    'fan-controller', 'headphones', 'internal-hard-drive', 'keyboard', 'memory', 'monitor',
    'motherboard', 'mouse', 'optical-drive', 'os', 'power-supply', 'sound-card', 'speakers',
    'thermal-paste', 'ups', 'video-card', 'webcam', 'wired-network-card', 'wireless-network-card',
];

/** Displays a searchable, category-filtered catalog of public PC parts. */
export default function PartsCatalog() {
    const [searchInput, setSearchInput] = useState('');
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('All');
    const [addedPartId, setAddedPartId] = useState<string | null>(null);
    const initialPrefetchKey = useRef<string | null>(null);
    const { addPart } = useBuild();
    const selectedCategory = category === 'All' ? undefined : category;
    const filterKey = `${search}\u0000${selectedCategory ?? ''}`;

    useEffect(() => {
        const timeout = setTimeout(() => setSearch(searchInput.trim()), 250);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    const catalog = useInfiniteQuery({
        queryKey: ['catalog-parts', search, selectedCategory],
        queryFn: ({ pageParam, signal }) => getCatalogParts({
            q: search,
            category: selectedCategory,
            page: pageParam,
            size: PAGE_SIZE,
            signal,
        }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
    });

    const parts = useMemo(() => catalog.data?.pages.flatMap((page) => page.content) ?? [], [catalog.data]);

    useEffect(() => {
        initialPrefetchKey.current = null;
    }, [filterKey]);

    useEffect(() => {
        if (!catalog.data || catalog.data.pages.length !== 1 || !catalog.hasNextPage
            || catalog.isFetchingNextPage || initialPrefetchKey.current === filterKey) return;
        initialPrefetchKey.current = filterKey;
        void catalog.fetchNextPage();
    }, [catalog.data, catalog.fetchNextPage, catalog.hasNextPage, catalog.isFetchingNextPage, filterKey]);

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

    /** Fetches and caches the next catalog page as the user approaches the list end. */
    const loadNextPage = useCallback(() => {
        if (catalog.hasNextPage && !catalog.isFetchingNextPage) void catalog.fetchNextPage();
    }, [catalog.fetchNextPage, catalog.hasNextPage, catalog.isFetchingNextPage]);

    const totalElements = catalog.data?.pages[0]?.totalElements ?? 0;
    const hasFilters = search.length > 0 || category !== 'All';

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PC Parts Catalog</Text>
            <TextInput
                accessibilityLabel="Search parts"
                placeholder="Search parts"
                placeholderTextColor="#737373"
                value={searchInput}
                onChangeText={setSearchInput}
                style={styles.search}
                returnKeyType="search"
            />
            <ScrollView horizontal style={styles.filterRail} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
                {['All', ...CATEGORIES].map((item) => (
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

            {catalog.isLoading ? (
                <View style={styles.centered}><ActivityIndicator size="large" color="#1976d2" /><Text style={styles.statusText}>Loading catalog...</Text></View>
            ) : catalog.isError && !catalog.data ? (
                <View style={styles.centered}><Text style={styles.errorText}>Could not load parts catalog. Check your connection and try again.</Text><TouchableOpacity style={styles.retryButton} onPress={() => { void catalog.refetch(); }}><Text style={styles.addButtonText}>Retry</Text></TouchableOpacity></View>
            ) : (
                <FlatList
                    style={styles.partsList}
                    data={parts}
                    keyExtractor={(item) => item.part_id}
                    renderItem={renderPartCard}
                    contentContainerStyle={styles.list}
                    onEndReached={loadNextPage}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={catalog.isFetchingNextPage ? (
                        <View style={styles.footer}><ActivityIndicator color="#1976d2" /><Text style={styles.statusText}>Loading more parts...</Text></View>
                    ) : catalog.isFetchNextPageError ? (
                        <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={loadNextPage}><Text style={styles.addButtonText}>Retry loading more parts</Text></TouchableOpacity>
                    ) : undefined}
                    ListEmptyComponent={(
                        <View style={styles.emptyState}>
                            <Text style={styles.statusText}>
                                {totalElements === 0 && !hasFilters ? 'No parts are available in the catalog yet.' : 'No parts match those filters.'}
                            </Text>
                            {hasFilters ? (
                                <TouchableOpacity
                                    accessibilityRole="button"
                                    style={styles.clearFiltersButton}
                                    onPress={() => { setSearchInput(''); setSearch(''); setCategory('All'); }}
                                >
                                    <Text style={styles.clearFiltersText}>Clear filters</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 0, width: '100%', backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    footer: { alignItems: 'center', paddingVertical: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#171717' },
    search: { borderWidth: 1, borderColor: '#c7c7c7', borderRadius: 8, backgroundColor: '#fff', color: '#171717', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    filterRail: { flexGrow: 0, flexShrink: 0, height: 44, marginBottom: 12 },
    filters: { gap: 8, alignItems: 'center' },
    filter: { alignSelf: 'center', justifyContent: 'center', minHeight: 36, flexShrink: 0, borderWidth: 1, borderColor: '#b7c0cc', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#fff' },
    activeFilter: { backgroundColor: '#1976d2', borderColor: '#1976d2' },
    filterText: { color: '#253044', fontSize: 13 },
    activeFilterText: { color: '#fff', fontWeight: 'bold' },
    list: { paddingBottom: 24, flexGrow: 1 },
    partsList: { flex: 1, minHeight: 0, width: '100%' },
    emptyState: { alignItems: 'center', padding: 24 },
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
    clearFiltersButton: { marginTop: 12, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, backgroundColor: '#1976d2' },
    clearFiltersText: { color: '#fff', fontWeight: 'bold' },
});
