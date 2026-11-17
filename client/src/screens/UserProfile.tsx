import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { tokenStore } from '@/lib/tokenStore';
import { getMe, updateProfile, deleteAccount, AppUser, ApiError } from '@/lib/api';

export default function UserProfile() {
    const [user, setUser] = useState<AppUser | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        setIsLoading(true);
        setErrorMsg('');
        try {
            const token = await tokenStore.get();
            if (!token) {
                setErrorMsg('You must be logged in to view this page.');
                return;
            }
            const fetchedUser = await getMe();
            setUser(fetchedUser);
            setDisplayName(fetchedUser.display_name || '');
        } catch (error) {
            console.error("Failed to load user:", error);
            setErrorMsg(error instanceof ApiError ? error.message : 'Could not load profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setMessage('');
        setErrorMsg('');

        try {
            const updatedUser = await updateProfile(displayName);
            setUser(updatedUser);
            setMessage('Profile updated successfully!');
        } catch (error) {
            console.error("Failed to update profile:", error);
            setErrorMsg(error instanceof ApiError ? error.message : 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const executeDelete = async () => {
        setIsDeleting(true);
        setErrorMsg('');
        try {
            await deleteAccount();
            await tokenStore.clear();
            setUser(null);
        } catch (error) {
            console.error("Failed to delete account:", error);
            setErrorMsg(error instanceof ApiError ? error.message : 'Failed to delete account.');
            setIsDeleting(false);
        }
    };

    const confirmDelete = () => {
        if (Platform.OS === 'web') {
            if (window.confirm("Are you sure? This will permanently delete your account and all PC builds. This cannot be undone.")) {
                void executeDelete();
            }
        }
        else {
            Alert.alert(
                "Delete Account",
                "Are you sure? This will permanently delete your account and all PC builds. This cannot be undone.", [
                    { text: "Cancel", style: "cancel" },
                    { text: "Delete Permanently", style: "destructive", onPress: () => void executeDelete() }
                ]
            );
        }
    };

    if (isLoading) {
        return (
            <View style = {[styles.container, styles.centered]}>
                <ActivityIndicator size = "large" color = "#1976d2" />
                <Text style = {styles.loadingText}> Loading profile... </Text>
            </View>
        );
    }

    if (!user) {
        return (
            <View style = {[styles.container, styles.centered]} >
                <Text style = {styles.errorText}> {errorMsg || 'You must be logged in to view this page.'} </Text>
            </View>
        );
    }

    return (
        <View style = {styles.container}>
            <Text style = {styles.title}> Your Profile </Text>

            <View style = {styles.card}>
                {errorMsg ? <Text style = {[styles.messageText, styles.errorText]}> {errorMsg} </Text> : null}
                {message ? <Text style = {styles.messageText}> {message} </Text> : null}

                <Text style = {styles.label}> Email Address </Text>
                <Text style = {styles.emailText}> {user.email} </Text>

                <Text style = {styles.label}> Display Name </Text>
                <TextInput
                    style = {styles.input}
                    value = {displayName}
                    onChangeText = {setDisplayName}
                    placeholder = "Enter display name"
                />

                <TouchableOpacity
                    style = {[styles.saveButton, (isSaving || displayName === (user.display_name || '')) && styles.disabledButton]}
                    onPress = {() => void handleSave()}
                    disabled = {isSaving || displayName === (user.display_name || '')}
                >
                    {isSaving ? (
                        <ActivityIndicator color = "#ffffff" />
                    ) : (
                        <Text style = {styles.buttonText}> Save Changes </Text>
                    )}
                </TouchableOpacity>
            </View>

            <View style = {styles.dangerZone}>
                <Text style = {styles.dangerTitle}> Danger Zone </Text>
                <Text style = {styles.dangerDescription}>
                    Once you delete your account, there is no going back. All your saved PC builds will be destroyed.
                </Text>

                <TouchableOpacity
                    style = {[styles.deleteButton, isDeleting && styles.disabledButton]}
                    onPress = {confirmDelete}
                    disabled = {isDeleting}
                >
                    {isDeleting ? (
                        <ActivityIndicator color="#ffffff" />
                    ) : (
                        <Text style={styles.buttonText}> Delete Account </Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
    loadingText: { marginTop: 12, color: '#666' },

    card: {
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2
    },
    label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
    emailText: { fontSize: 16, color: '#333', marginBottom: 16, paddingVertical: 8 },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 6,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        backgroundColor: '#fafafa'
    },
    saveButton: {
        backgroundColor: '#1976d2',
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
    },
    disabledButton: {
        opacity: 0.6
    },
    buttonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    messageText: { marginBottom: 16, textAlign: 'center', color: '#2e7d32', fontWeight: '600' },
    errorText: { color: '#d32f2f' },

    dangerZone: {
        backgroundColor: '#ffebee',
        padding: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    dangerTitle: { fontSize: 18, fontWeight: 'bold', color: '#d32f2f', marginBottom: 8 },
    dangerDescription: { fontSize: 14, color: '#b71c1c', marginBottom: 16 },
    deleteButton: {
        backgroundColor: '#d32f2f',
        padding: 14,
        borderRadius: 6,
        alignItems: 'center',
    }
});