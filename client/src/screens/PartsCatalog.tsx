import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Part } from '@/types/build';

const CATEGORIES = ['CPU', 'GPU', 'Motherboard', 'RAM', 'Storage', 'Power Supply', 'Case', 'Cooler'];

async function loadParts(): Promise<Part[]> {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8080';
    const url = category
        ? `${apiUrl}/api/v1/parts?category=${encodeURIComponent(category)}`
        : `${apiUrl}/api/v1/parts`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.content;
}

/* Displays a list of available PC parts fetched from the API. */
export default function PartsCatalog() {
    const [parts, setParts] = useState<Part[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    /* Fetches the paginated parts catalog from the Spring Boot API.
     * It uses EXPO_PUBLIC_API_URL, complying with the security rule that public variables ship to the client while secrets stay on the server. */
    const fetchParts = useCallback(() => {
        setIsLoading(true);
        setError(null);
        loadParts(selectedCategory)
            .then((data) => {
                setParts(data);
            }).catch((err: unknown) => {
            console.error("Failed to fetch parts:", err);
            setError('Could not load parts catalog. Is the API running?');
        }).finally(() => {
            setIsLoading(false);
        });
    }, [selectedCategory]);

    /* Triggers the network request to fetch the catalog data as soon as the component mounts. */
    useEffect(() => {
        void fetchParts();
    }, [fetchParts]);

    /* Renders an individual part card and the button used to add it to the active build. */
    const renderPartCard = ({ item }: { item: Part }) => (
        <View style = {styles.card}>
            <View style = {styles.cardHeader}>
                <Text style = {styles.category}>{item.category} </Text>
                <Text style = {styles.price}>${item.price.toFixed(2)} </Text>
            </View>
            <Text style = {styles.name}>{item.name} </Text>

            <TouchableOpacity style = {styles.addButton} onPress = {() => console.log(`Added ${item.name} to build`)}>
                <Text style = {styles.addButtonText}> Add to Build </Text>
            </TouchableOpacity>
        </View>
    );

    /* Renders a loading indicator while waiting for the initial API response. */
    if (isLoading) {
        return (
            <View style = {[styles.container, styles.centered]}>
                <ActivityIndicator size ="large" color="#1976d2" />
                <Text style = {styles.loadingText}> Loading catalog... </Text>
            </View>
        );
    }

    /* Displays an error state with a retry option if the backend connection fails. */
    if (error) {
        return (
            <View style = {[styles.container, styles.centered]}>
                <Text style = {styles.errorText}> {error} </Text>
                <TouchableOpacity style = {styles.retryButton} onPress = {fetchParts}>
                    <Text style = {styles.addButtonText}> Retry </Text>
                </TouchableOpacity>
            </View>
        );
    }

    /* Returns the main catalog layout utilizing a scrollable list suitable for both mobile and web clients. */
    return (
        <View style = {styles.container}>
            <Text style = {styles.title}> PC Parts Catalog </Text>
            <View style = {styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator = {false} contentContainerStyle = {styles.filterScroll}>
                    <TouchableOpacity
                        style = {[styles.filterPill, selectedCategory === null && styles.filterPillActive]}
                        onPress = {() => setSelectedCategory(null)}
                    >
                        <Text style = {[styles.filterPillText, selectedCategory === null && styles.filterPillTextActive]}> All </Text>
                    </TouchableOpacity>

                    {CATEGORIES.map(cat => (
                        <TouchableOpacity
                            key = {cat}
                            style = {[styles.filterPill, selectedCategory === cat && styles.filterPillActive]}
                            onPress = {() => setSelectedCategory(cat)}
                        >
                            <Text style = {[styles.filterPillText, selectedCategory === cat && styles.filterPillTextActive]}> {cat} </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style = {[styles.container, styles.centered]}>
                    <ActivityIndicator size = "large" color = "#1976d2" />
                    <Text style = {styles.loadingText}> Loading catalog... </Text>
                </View>
            ) : (
                <FlatList
                    data = {parts}
                    keyExtractor = {(item) => item.part_id}
                    renderItem = {renderPartCard}
                    contentContainerStyle = {styles.list}
                    ListEmptyComponent = { <Text style = {styles.emptyText}>No parts found for this category. </Text> }
                />
            )}
        </View>
    );
}

/* Defines the cross-platform styling rules for the parts catalog UI. */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },

    filterContainer: { marginBottom: 16 },
    filterScroll: { gap: 8, paddingRight: 16 },
    filterPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#e0e0e0',
        borderRadius: 20
    },
    filterPillActive: { backgroundColor: '#1976d2' },
    filterPillText: { color: '#333', fontWeight: '600' },
    filterPillTextActive: { color: '#fff' },

    list: { paddingBottom: 24 },
    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    categoryText: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    price: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
    name: { fontSize: 18, marginBottom: 16 },
    addButton: { backgroundColor: '#1976d2', padding: 10, borderRadius: 6, alignItems: 'center' },
    retryButton: { backgroundColor: '#d32f2f', padding: 10, borderRadius: 6, alignItems: 'center', marginTop: 12 },
    addButtonText: { color: '#ffffff', fontWeight: 'bold' },
    loadingText: { marginTop: 12, color: '#666' },
    errorText: { color: '#d32f2f', fontSize: 16, textAlign: 'center' },
    emptyText: { textAlign: 'center', color: '#666', marginTop: 32, fontSize: 16 }
});
