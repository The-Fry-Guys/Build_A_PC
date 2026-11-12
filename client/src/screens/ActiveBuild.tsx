import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useBuild } from '@/hooks/useBuild';
import { Part } from '@/types/build';

/* Displays the user's active PC build. */
export default function ActiveBuild() {
    const {
        selectedParts,
        buildName,
        removePart,
        getTotalPrice,
        getCompatibility
    } = useBuild();

    /* Retrieves the build's compatibility status whether their current parts are compatible or not, and which part causes incompatability */
    const compatibility = getCompatibility();
    const renderSelectedPart = ({ item }: { item: Part }) => (
        <View style = {styles.card}>
            <View style = {styles.cardInfo}>
                <Text style = {styles.category}>{item.category} </Text>
                <Text style = {styles.name}>{item.name} </Text>
                <Text style = {styles.price}>${item.price.toFixed(2)} </Text>
            </View>
            <TouchableOpacity
                style = {styles.removeButton}
                onPress = {() => removePart(item.part_id)}
            >
                <Text style = {styles.removeButtonText}> Remove </Text>
            </TouchableOpacity>
        </View>
    );

    /* Renders the builder interface using React Native primitives to ensure the app runs on the web and Android from one codebase. */
    return (
        <View style = {styles.container}>
            <Text style = {styles.title}>{buildName} </Text>
            <View style = {[styles.banner, compatibility.compatible ? styles.bannerSuccess : styles.bannerWarning]}>
                <Text style = {[styles.bannerText, compatibility.compatible ? styles.bannerTextSuccess : styles.bannerTextWarning]}>
                    {compatibility.compatible ? 'All parts are compatible' : 'Compatibility Issues Found'}
                </Text>
                {!compatibility.compatible && compatibility.issues.map((issue, index) => (
                    <Text key = {index} style={styles.issueText}> {issue} </Text>
                ))}
            </View>

            <Text style = {styles.totalText}>Total: ${getTotalPrice().toFixed(2)} </Text>

            {selectedParts.length === 0 ? (
                <Text style = {styles.emptyText}>No parts selected yet. Go to the catalog to add parts! </Text>
            ) : (
                <FlatList
                    data = {selectedParts}
                    keyExtractor = {(item) => item.part_id}
                    renderItem = {renderSelectedPart}
                    contentContainerStyle = {styles.list}
                />
            )}
        </View>
    );
}

/* Defines the cross-platform styling rules for the active build screen. */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
    totalText: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'right' },
    emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginTop: 32 },
    list: { paddingBottom: 24 },

    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2
    },
    cardInfo: { flex: 1 },
    category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    name: { fontSize: 16, fontWeight: 'bold', marginVertical: 4 },
    price: { fontSize: 14, color: '#2e7d32' },
    removeButton: { backgroundColor: '#d32f2f', padding: 8, borderRadius: 6 },
    removeButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },

    banner: { padding: 12, borderRadius: 8, marginBottom: 16 },
    bannerSuccess: { backgroundColor: '#e8f5e9', borderColor: '#4caf50', borderWidth: 1 },
    bannerWarning: { backgroundColor: '#fff3e0', borderColor: '#ff9800', borderWidth: 1 },
    bannerText: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    bannerTextSuccess: { color: '#2e7d32' },
    bannerTextWarning: { color: '#e65100' },
    issueText: { fontSize: 14, color: '#d84315', marginTop: 4 }
});