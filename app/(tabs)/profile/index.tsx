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
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { updateUser } from '../../../firebase/firestore';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { t } = useTranslation(['profile', 'common']);
  const { userData, refreshUser } = useAuth();
  const { language, changeLanguage, supportedLanguages } = useLanguage();
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
      Alert.alert(t('common:error'), t('profile:errors.enterName'));
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

      Alert.alert(t('common:success'), t('profile:success.profileUpdated'), [
        { text: t('common:ok'), onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[Profile] Error updating profile:', error);
      Alert.alert(t('common:error'), t('profile:errors.failedToUpdate'));
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageChange = async (langCode: string) => {
    await changeLanguage(langCode);
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
              {t('profile:avatarHint')}
            </Text>
          </View>

          {/* Profile Form */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>{t('profile:sections.personalInfo')}</Text>
            </View>

            <Input
              label={t('profile:form.displayName')}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder={t('profile:form.displayNamePlaceholder')}
              autoCapitalize="words"
            />

            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>{t('profile:form.email')}</Text>
              <Text style={styles.emailValue}>{userData?.email}</Text>
              <View style={styles.emailBadge}>
                <Ionicons name="lock-closed" size={12} color="#999" />
                <Text style={styles.emailBadgeText}>{t('profile:form.emailCannotChange')}</Text>
              </View>
            </View>
          </Card>

          {/* Language Selection */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="globe" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>{t('profile:sections.language')}</Text>
            </View>
            
            <Text style={styles.languageHint}>{t('profile:language.selectLanguage')}</Text>
            
            <View style={styles.languageOptions}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionActive,
                  ]}
                  onPress={() => handleLanguageChange(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text
                    style={[
                      styles.languageName,
                      language === lang.code && styles.languageNameActive,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Account Info */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>{t('profile:sections.accountInfo')}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('profile:form.userId')}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {userData?.uid}
              </Text>
            </View>

            {userData?.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{t('common:dates.memberSince')}</Text>
                <Text style={styles.infoValue}>
                  {new Date(userData.createdAt).toLocaleDateString(
                    language === 'pt' ? 'pt-BR' : 'en-US',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    }
                  )}
                </Text>
              </View>
            )}
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={saving ? t('common:saving') : t('common:saveChanges')}
              onPress={handleSave}
              disabled={saving}
              style={styles.saveButton}
            />
            <Button
              title={t('common:cancel')}
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
  // Language
  languageHint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  languageOptions: {
    gap: 8,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageOptionActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  languageNameActive: {
    fontWeight: '600',
    color: '#2E7D32',
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
