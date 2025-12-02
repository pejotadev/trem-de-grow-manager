import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { StatusBar } from 'expo-status-bar';
import { showError, showWarning } from '../../utils/toast';

export default function RegisterScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showWarning(t('common:validation.fillAllFields'), t('common:error'));
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
      await register(email, password);
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
});
