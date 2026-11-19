import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { getCatalogParts, getCatalogPriceRange, type CatalogPart } from '@/lib/api';
import { useBuild } from '@/hooks/useBuild';
import { useSession } from '@/auth/session-provider';
import type { Part } from '@/types/build';
import PriceRangeSlider from '@/components/PriceRangeSlider';

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
    const [priceRange, setPriceRange] = useState<{ min: number; max: number } | null>(null);
    const [addedPartId, setAddedPartId] = useState<string | null>(null);
    const initialPrefetchKey = useRef<string | null>(null);
    const { addPart } = useBuild();
    const { user } = useSession();
    const selectedCategory = category === 'All' ? undefined : category;
    const priceBounds = useQuery({
        queryKey: ['catalog-price-range'],
        queryFn: getCatalogPriceRange,
        staleTime: 5 * 60_000,
    });
    const domainMin = priceBounds.data?.min_price ?? 0;
    const domainMax = priceBounds.data?.max_price ?? domainMin;
    const filterKey = `${search}\u0000${selectedCategory ?? ''}\u0000${priceRange?.min ?? ''}\u0000${priceRange?.max ?? ''}`;

    useEffect(() => {
        const timeout = setTimeout(() => setSearch(searchInput.trim()), 250);
        return () => clearTimeout(timeout);
    }, [searchInput]);

    const catalog = useInfiniteQuery({
        queryKey: ['catalog-parts', search, selectedCategory, priceRange?.min, priceRange?.max],
        queryFn: ({ pageParam, signal }) => getCatalogParts({
            q: search,
            category: selectedCategory,
            minPrice: priceRange?.min,
            maxPrice: priceRange?.max,
            page: pageParam,
            size: PAGE_SIZE,
            signal,
        }),
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.page + 1 < lastPage.totalPages ? lastPage.page + 1 : undefined,
        staleTime: 60_000,
        gcTime: 5 * 60_000,
    });
    const {
        data: catalogData,
        hasNextPage: catalogHasNextPage,
        isFetchingNextPage: catalogIsFetchingNextPage,
        fetchNextPage: fetchNextCatalogPage,
    } = catalog;

    const parts = useMemo(() => catalogData?.pages.flatMap((page) => page.content) ?? [], [catalogData]);

    useEffect(() => {
        initialPrefetchKey.current = null;
    }, [filterKey]);

    useEffect(() => {
        if (!catalogData || catalogData.pages.length !== 1 || !catalogHasNextPage
            || catalogIsFetchingNextPage || initialPrefetchKey.current === filterKey) return;
        initialPrefetchKey.current = filterKey;
        void fetchNextCatalogPage();
    }, [catalogData, catalogHasNextPage, catalogIsFetchingNextPage, fetchNextCatalogPage, filterKey]);

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
            {user ? (
                <TouchableOpacity accessibilityRole="button" style={styles.addButton} onPress={() => addToBuild(item)}>
                    <Text style={styles.addButtonText}>{addedPartId === item.part_id ? 'Added to Build' : 'Add to Build'}</Text>
                </TouchableOpacity>
            ) : null}
        </View>
    );

    /** Fetches and caches the next catalog page as the user approaches the list end. */
    const loadNextPage = useCallback(() => {
        if (catalogHasNextPage && !catalogIsFetchingNextPage) void fetchNextCatalogPage();
    }, [catalogHasNextPage, catalogIsFetchingNextPage, fetchNextCatalogPage]);

    const totalElements = catalogData?.pages[0]?.totalElements ?? 0;
    const hasFilters = search.length > 0 || category !== 'All' || priceRange !== null;

    /** Applies slider bounds and omits the price filter when the full catalog range is selected. */
    const applyPriceRange = (range: { min: number; max: number }) => {
        setPriceRange(range.min <= domainMin && range.max >= domainMax ? null : range);
    };

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

            <View style={styles.catalogBody}>
                <View style={styles.priceRail}>
                    {priceBounds.data && priceBounds.data.min_price !== null && priceBounds.data.max_price !== null ? (
                        <PriceRangeSlider
                            key={`${domainMin}:${domainMax}:${priceRange?.min ?? ''}:${priceRange?.max ?? ''}`}
                            domainMin={domainMin}
                            domainMax={domainMax}
                            selectedMin={priceRange?.min ?? null}
                            selectedMax={priceRange?.max ?? null}
                            onApply={applyPriceRange}
                        />
                    ) : priceBounds.isError ? (
                        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading price range" onPress={() => { void priceBounds.refetch(); }} style={styles.priceError}>
                            <Text style={styles.priceErrorText}>$ ↻</Text>
                        </TouchableOpacity>
                    ) : priceBounds.isLoading ? (
                        <ActivityIndicator accessibilityLabel="Loading price range" color="#1976d2" />
                    ) : (
                        <Text style={styles.noPrices}>$</Text>
                    )}
                </View>
                <View style={styles.listRegion}>
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
                                            onPress={() => { setSearchInput(''); setSearch(''); setCategory('All'); setPriceRange(null); }}
                                        >
                                            <Text style={styles.clearFiltersText}>Clear filters</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                            )}
                        />
                    )}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 0, width: '100%', backgroundColor: '#f5f5f5', padding: 16, overflow: 'hidden' },
    listRegion: { flex: 1, minHeight: 0, overflow: 'hidden' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    footer: { alignItems: 'center', paddingVertical: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12, color: '#171717' },
    search: { borderWidth: 1, borderColor: '#c7c7c7', borderRadius: 8, backgroundColor: '#fff', color: '#171717', paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
    catalogBody: { flex: 1, minHeight: 0, flexDirection: 'row', alignItems: 'stretch', gap: 12, overflow: 'hidden' },
    priceRail: { width: 116, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
    priceError: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#d5dbe3' },
    priceErrorText: { color: '#b42318', fontSize: 18 },
    noPrices: { color: '#667085', fontSize: 18 },
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
