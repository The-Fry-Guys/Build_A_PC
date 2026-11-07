import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { MOCK_PARTS } from '../data/mockParts';
import { Part } from '../types/build';

export default function PartsCatalog() {
    const [parts, setParts] = useState<Part[]>(MOCK_PARTS);

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

    return (
        <View style = {styles.container}>
            <Text style = {styles.title}> PC Parts Catalog </Text>
            <FlatList
                data = {parts}
                keyExtractor = {(item) => item.part_id}
                renderItem = {renderPartCard}
                contentContainerStyle = {styles.list}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
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
    price: { fontSize: 16, fontWeight: 'bold', color: '#2e7d32' },
    name: { fontSize: 18, marginBottom: 16 },
    addButton: { backgroundColor: '#1976d2', padding: 10, borderRadius: 6, alignItems: 'center' },
    addButtonText: { color: '#ffffff', fontWeight: 'bold' }
});