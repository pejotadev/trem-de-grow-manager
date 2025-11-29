import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { updateUser } from '../../../firebase/firestore';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { userData, refreshUser } = useAuth();
  const router = useRouter();

  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setDisplayName(userData.displayName || '');
    }
  }, [userData]);

  const handleSave = async () => {
    if (!userData) return;

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setSaving(true);

    try {
      await updateUser(userData.uid, {
        displayName: displayName.trim(),
      });

      // Refresh user data in context
      if (refreshUser) {
        await refreshUser();
      }

      Alert.alert('Success', 'Profile updated successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[Profile] Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {getInitials(displayName || userData?.displayName, userData?.email)}
              </Text>
            </View>
            <Text style={styles.avatarHint}>
              Your initials are generated from your name
            </Text>
          </View>

          {/* Profile Form */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <Input
              label="Display Name"
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter your name"
              autoCapitalize="words"
            />

            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>Email</Text>
              <Text style={styles.emailValue}>{userData?.email}</Text>
              <View style={styles.emailBadge}>
                <Ionicons name="lock-closed" size={12} color="#999" />
                <Text style={styles.emailBadgeText}>Cannot be changed</Text>
              </View>
            </View>
          </Card>

          {/* Account Info */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Account Information</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {userData?.uid}
              </Text>
            </View>

            {userData?.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Member Since</Text>
                <Text style={styles.infoValue}>
                  {new Date(userData.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            )}
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            />
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              disabled={saving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  // Avatar
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarHint: {
    fontSize: 13,
    color: '#999',
  },
  // Sections
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  // Email
  emailRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emailValue: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emailBadgeText: {
    fontSize: 12,
    color: '#999',
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  // Actions
  actions: {
    marginTop: 8,
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
});


