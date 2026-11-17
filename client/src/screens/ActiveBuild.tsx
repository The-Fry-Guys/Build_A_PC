import React, { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { useBuild } from '@/hooks/useBuild';
import { createSavedBuild, updateSavedBuild } from '@/lib/api';
import type { Part } from '@/types/build';

/** Shows the active PC build, its budget status, and saved-build actions. */
export default function ActiveBuild() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { buildId, budget, selectedParts, buildName, setBudget, setBuildId, setBuildName, removePart, getTotalPrice } = useBuild();
    const [budgetOpen, setBudgetOpen] = useState(false);
    const [budgetText, setBudgetText] = useState(budget === null ? '' : String(budget));
    const [budgetError, setBudgetError] = useState('');
    const [finalizeOpen, setFinalizeOpen] = useState(false);
    const [nameText, setNameText] = useState(buildName);
    const [saveError, setSaveError] = useState('');
    const total = getTotalPrice();
    const budgetColor = budget === null ? '#536174' : total > budget ? '#b42318' : budget - total <= 100 ? '#9a6700' : '#188038';
    const saveBuild = useMutation({
        mutationFn: (name: string) => {
            const input = {
                name,
                budget,
                parts: selectedParts.map((part) => ({ partId: part.part_id, quantity: part.quantity ?? 1 })),
            };
            return buildId ? updateSavedBuild(buildId, input) : createSavedBuild(input);
        },
        onSuccess: (saved) => {
            setBuildId(saved.id);
            setBuildName(saved.name);
            setFinalizeOpen(false);
            setSaveError('');
            void queryClient.invalidateQueries({ queryKey: ['saved-builds'] });
            void queryClient.invalidateQueries({ queryKey: ['saved-build', saved.id] });
            router.push('/builds' as Href);
        },
        onError: (error) => setSaveError(error instanceof Error ? error.message : 'Could not save this build.'),
    });

    /** Validates and stores a budget before it is persisted with the next build save. */
    const submitBudget = () => {
        const value = budgetText.trim();
        if (!/^\d{1,8}(\.\d{1,2})?$/.test(value)) {
            setBudgetError('Enter a budget with up to 8 whole digits and 2 decimal places.');
            return;
        }
        setBudget(Number(value));
        setBudgetError('');
        setBudgetOpen(false);
    };

    /** Saves the build under its chosen name and opens the saved-build directory. */
    const submitBuild = () => {
        const name = nameText.trim();
        if (!name || name.length > 255) {
            setSaveError('Enter a build name with 1 to 255 characters.');
            return;
        }
        saveBuild.mutate(name);
    };

    /** Renders one selected catalog part with its current quantity and remove action. */
    const renderSelectedPart = (item: Part) => (
        <View key={item.part_id} style={styles.card}>
            <View style={styles.cardInfo}>
                <Text style={styles.category}>{item.category}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.price}>{item.price == null ? 'Price unavailable' : `$${((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}`}</Text>
                {(item.quantity ?? 1) > 1 && <Text style={styles.quantity}>Quantity: {item.quantity}</Text>}
            </View>
            <TouchableOpacity accessibilityRole="button" style={styles.removeButton} onPress={() => removePart(item.part_id)}>
                <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
        </View>
    );

    return <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{buildName}</Text>
        <Text accessibilityLabel={budget === null ? `Build total ${total.toFixed(2)} dollars, no budget set` : `Build spending ${total.toFixed(2)} of ${budget.toFixed(2)} dollars`}
            style={[styles.totalText, { color: budgetColor }]}>
            {budget === null ? `Total: $${total.toFixed(2)} · No budget set` : `$${total.toFixed(2)}/$${budget.toFixed(2)}`}
        </Text>

        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => {
            setBudgetText(budget === null ? '' : String(budget));
            setBudgetError('');
            setBudgetOpen(true);
        }}>
            <Text style={styles.secondaryButtonText}>{budget === null ? 'Set Budget' : 'Edit Budget'}</Text>
        </TouchableOpacity>

        {budgetOpen && <View style={styles.budgetPanel}>
            <Text style={styles.label}>Maximum budget ($)</Text>
            <TextInput accessibilityLabel="Maximum budget" value={budgetText} onChangeText={setBudgetText} keyboardType="decimal-pad"
                placeholder="e.g. 1500.00" style={styles.input} />
            {budgetError ? <Text accessibilityRole="alert" style={styles.error}>{budgetError}</Text> : null}
            <View style={styles.actions}>
                <TouchableOpacity accessibilityRole="button" style={styles.primaryButton} onPress={submitBudget}><Text style={styles.buttonText}>Submit budget</Text></TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => { setBudgetError(''); setBudgetOpen(false); }}><Text style={styles.secondaryButtonText}>Cancel</Text></TouchableOpacity>
            </View>
        </View>}

        {selectedParts.length === 0
            ? <Text style={styles.emptyText}>No parts selected yet. Go to the catalog to add parts.</Text>
            : selectedParts.map(renderSelectedPart)}

        {selectedParts.length > 0 && <TouchableOpacity accessibilityRole="button" style={styles.finalizeButton} onPress={() => {
            setNameText(buildName);
            setSaveError('');
            setFinalizeOpen(true);
        }}>
            <Text style={[styles.buttonText, styles.finalizeButtonText]}>{buildId ? 'Save Build' : 'Finalize Build'}</Text>
        </TouchableOpacity>}

        <Modal visible={finalizeOpen} transparent animationType="fade" onRequestClose={() => setFinalizeOpen(false)}>
            <View style={styles.modalBackdrop}>
                <View style={styles.modalCard}>
                    <Text style={styles.modalTitle}>{buildId ? 'Save your changes' : 'Name your build'}</Text>
                    <Text style={styles.label}>Build name</Text>
                    <TextInput accessibilityLabel="Build name" value={nameText} onChangeText={setNameText} maxLength={255} style={styles.input} />
                    {saveError ? <Text accessibilityRole="alert" style={styles.error}>{saveError}</Text> : null}
                    <View style={styles.actions}>
                        <TouchableOpacity accessibilityRole="button" disabled={saveBuild.isPending} style={styles.primaryButton} onPress={submitBuild}>
                            <Text style={styles.buttonText}>{saveBuild.isPending ? 'Saving…' : 'Submit'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity accessibilityRole="button" disabled={saveBuild.isPending} style={styles.secondaryButton} onPress={() => setFinalizeOpen(false)}>
                            <Text style={styles.secondaryButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    </ScrollView>;
}

const styles = StyleSheet.create({
    container: { flex: 1, minHeight: 0, backgroundColor: '#f5f5f5' },
    content: { padding: 16, paddingBottom: 112, gap: 12 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#171717' },
    totalText: { fontSize: 20, fontWeight: 'bold', textAlign: 'right' },
    label: { fontSize: 15, fontWeight: '600', color: '#253044' },
    emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginVertical: 32 },
    budgetPanel: { backgroundColor: '#fff', borderRadius: 8, padding: 14, gap: 8 },
    input: { borderWidth: 1, borderColor: '#b7c0cc', borderRadius: 8, backgroundColor: '#fff', color: '#171717', padding: 12, minHeight: 46 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    primaryButton: { backgroundColor: '#1976d2', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    secondaryButton: { backgroundColor: '#e5e7eb', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start' },
    secondaryButtonText: { color: '#253044', fontWeight: '600' },
    finalizeButton: { backgroundColor: '#1976d2', width: '33%', alignSelf: 'center', minHeight: 40, paddingHorizontal: 4, paddingVertical: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    finalizeButtonText: { fontSize: 12 },
    buttonText: { color: '#fff', fontWeight: 'bold' },
    error: { color: '#b42318' },
    card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, elevation: 2 },
    cardInfo: { flex: 1 },
    category: { fontSize: 12, color: '#666', textTransform: 'uppercase' },
    name: { fontSize: 16, fontWeight: 'bold', marginVertical: 4, color: '#171717' },
    price: { fontSize: 14, color: '#188038' },
    quantity: { fontSize: 13, color: '#555' },
    removeButton: { backgroundColor: '#d32f2f', padding: 9, borderRadius: 6 },
    removeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
    modalBackdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: 'rgba(0,0,0,0.55)' },
    modalCard: { width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 20, gap: 12 },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#171717' },
});
