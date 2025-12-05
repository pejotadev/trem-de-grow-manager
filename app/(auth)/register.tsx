import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { StatusBar } from 'expo-status-bar';
import { showError, showWarning } from '../../utils/toast';
import { AccountType } from '../../types';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showWarning(t('common:validation.fillAllFields'), t('common:error'));
      return;
    }

    if (!accountType) {
      showWarning(t('auth:register.accountTypeRequired'), t('common:error'));
      return;
    }

    if (password !== confirmPassword) {
      showWarning(t('common:validation.passwordsDontMatch'), t('common:error'));
      return;
    }

    if (password.length < 6) {
      showWarning(t('common:validation.passwordTooShort'), t('common:error'));
      return;
    }

    setLoading(true);
    try {
      await register(email, password, accountType);
      
      // For association accounts, redirect to association creation screen
      // For personal accounts, the default redirect in _layout.tsx will handle it
      if (accountType === 'association') {
        router.replace('/(tabs)/association/new');
      }
    } catch (error: any) {
      showError(error.message, t('auth:register.registrationFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text style={styles.title}>{t('auth:register.title')}</Text>
            <Text style={styles.subtitle}>{t('auth:register.subtitle')}</Text>

            <Input
              label={t('auth:register.emailLabel')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder={t('auth:register.emailPlaceholder')}
            />

            <Input
              label={t('auth:register.passwordLabel')}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder={t('auth:register.passwordPlaceholder')}
            />

            <Input
              label={t('auth:register.confirmPasswordLabel')}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder={t('auth:register.confirmPasswordPlaceholder')}
            />

            {/* Account Type Selection */}
            <View style={styles.accountTypeContainer}>
              <Text style={styles.accountTypeLabel}>{t('auth:register.accountTypeLabel')}</Text>
              <View style={styles.accountTypeOptions}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeOption,
                    accountType === 'personal' && styles.accountTypeOptionSelected,
                  ]}
                  onPress={() => setAccountType('personal')}
                >
                  <Ionicons
                    name={accountType === 'personal' ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={accountType === 'personal' ? '#4CAF50' : '#666'}
                  />
                  <View style={styles.accountTypeContent}>
                    <Text
                      style={[
                        styles.accountTypeTitle,
                        accountType === 'personal' && styles.accountTypeTitleSelected,
                      ]}
                    >
                      {t('auth:register.personalAccount')}
                    </Text>
                    <Text style={styles.accountTypeDescription}>
                      {t('auth:register.personalAccountDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.accountTypeOption,
                    accountType === 'association' && styles.accountTypeOptionSelected,
                  ]}
                  onPress={() => setAccountType('association')}
                >
                  <Ionicons
                    name={accountType === 'association' ? 'radio-button-on' : 'radio-button-off'}
                    size={24}
                    color={accountType === 'association' ? '#4CAF50' : '#666'}
                  />
                  <View style={styles.accountTypeContent}>
                    <Text
                      style={[
                        styles.accountTypeTitle,
                        accountType === 'association' && styles.accountTypeTitleSelected,
                      ]}
                    >
                      {t('auth:register.associationAccount')}
                    </Text>
                    <Text style={styles.accountTypeDescription}>
                      {t('auth:register.associationAccountDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <Button title={t('auth:register.signUpButton')} onPress={handleRegister} disabled={loading} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth:register.hasAccount')} </Text>
              <Link href="/(auth)/login" style={styles.link}>
                <Text style={styles.linkText}>{t('auth:register.login')}</Text>
              </Link>
            </View>
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#4CAF50',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    color: '#666',
    marginBottom: 32,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#666',
  },
  link: {
    // Link component handles press
  },
  linkText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  accountTypeContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  accountTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  accountTypeOptions: {
    gap: 12,
  },
  accountTypeOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    gap: 12,
  },
  accountTypeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  accountTypeContent: {
    flex: 1,
  },
  accountTypeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  accountTypeTitleSelected: {
    color: '#4CAF50',
  },
  accountTypeDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
});
