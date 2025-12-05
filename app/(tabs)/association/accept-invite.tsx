import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getInvitation, 
  acceptInvitation,
  rejectInvitation 
} from '../../../firebase/associations';
import { AssociationInvitation } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const DOCUMENT_TYPES = [
  { value: 'cpf', label: 'CPF' },
  { value: 'rg', label: 'RG' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
] as const;

export default function AcceptInviteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userData, refreshUser } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  const [invitation, setInvitation] = useState<AssociationInvitation | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [documentType, setDocumentType] = useState<'cpf' | 'rg' | 'passport' | 'other'>('cpf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInvitation();
  }, [id]);

  const loadInvitation = async () => {
    if (!id) {
      setError('Invalid invitation ID');
      setLoading(false);
      return;
    }

    try {
      const inv = await getInvitation(id);
      
      if (!inv) {
        setError(t('acceptInvite.notFound'));
        setLoading(false);
        return;
      }

      if (inv.status !== 'pending') {
        setError(t('acceptInvite.alreadyProcessed'));
        setLoading(false);
        return;
      }

      if (inv.expiresAt < Date.now()) {
        setError(t('acceptInvite.expired'));
        setLoading(false);
        return;
      }

      if (userData && inv.invitedEmail.toLowerCase() !== userData.email.toLowerCase()) {
        setError(t('acceptInvite.wrongEmail'));
        setLoading(false);
        return;
      }

      setInvitation(inv);
      
      // Pre-fill name if user has displayName
      if (userData?.displayName) {
        setFullName(userData.displayName);
      }
    } catch (err: any) {
      console.error('[AcceptInvite] Error loading invitation:', err);
      setError(err.message || t('acceptInvite.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = t('acceptInvite.errors.fullNameRequired');
    }

    if (!documentNumber.trim()) {
      errors.documentNumber = t('acceptInvite.errors.documentRequired');
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAccept = async () => {
    if (!validate() || !invitation || !userData) return;

    setSubmitting(true);

    try {
      await acceptInvitation(
        invitation.id,
        userData.uid,
        userData.email,
        fullName.trim(),
        documentType,
        documentNumber.trim(),
        userData.displayName
      );

      // Refresh user data to get updated associations
      await refreshUser();

      const successMessage = t('acceptInvite.success', { name: invitation.associationName });
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }

      router.replace('/(tabs)/association');
    } catch (err: any) {
      console.error('[AcceptInvite] Error accepting invitation:', err);
      const errorMessage = err.message || t('acceptInvite.acceptError');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!invitation) return;

    const confirmDecline = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(t('acceptInvite.confirmDecline')));
        } else {
          Alert.alert(
            t('acceptInvite.declineTitle'),
            t('acceptInvite.confirmDecline'),
            [
              { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('decline'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        }
      });
    };

    const confirmed = await confirmDecline();
    if (!confirmed) return;

    setSubmitting(true);

    try {
      await rejectInvitation(invitation.id);

      const successMessage = t('acceptInvite.declineSuccess');
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }

      router.replace('/(tabs)/association');
    } catch (err: any) {
      console.error('[AcceptInvite] Error declining invitation:', err);
      const errorMessage = err.message || t('acceptInvite.declineError');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
          <Text style={styles.errorTitle}>{t('acceptInvite.errorTitle')}</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title={t('back')}
            onPress={() => router.back()}
            style={styles.backButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!invitation) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Invitation Details Card */}
          <Card style={styles.invitationCard}>
            <View style={styles.invitationHeader}>
              <Ionicons name="mail-open-outline" size={48} color="#4CAF50" />
              <Text style={styles.invitationTitle}>{t('acceptInvite.title')}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('acceptInvite.association')}:</Text>
              <Text style={styles.detailValue}>{invitation.associationName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('acceptInvite.invitedBy')}:</Text>
              <Text style={styles.detailValue}>{invitation.invitedByName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('acceptInvite.role')}:</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{t(`roles.${invitation.invitedRole}`)}</Text>
              </View>
            </View>

            {invitation.message && (
              <View style={styles.messageContainer}>
                <Text style={styles.messageLabel}>{t('acceptInvite.message')}:</Text>
                <Text style={styles.messageText}>{invitation.message}</Text>
              </View>
            )}
          </Card>

          {/* Form Card */}
          <Card style={styles.formCard}>
            <Text style={styles.formTitle}>{t('acceptInvite.yourInfo')}</Text>
            <Text style={styles.formSubtitle}>{t('acceptInvite.yourInfoDesc')}</Text>

            <Input
              label={t('acceptInvite.fullName')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('acceptInvite.fullNamePlaceholder')}
              error={formErrors.fullName}
            />

            <Text style={styles.inputLabel}>{t('acceptInvite.documentType')}</Text>
            <View style={styles.documentTypeContainer}>
              {DOCUMENT_TYPES.map((doc) => (
                <Button
                  key={doc.value}
                  title={doc.label}
                  variant={documentType === doc.value ? 'primary' : 'secondary'}
                  onPress={() => setDocumentType(doc.value)}
                  style={styles.documentTypeButton}
                />
              ))}
            </View>

            <Input
              label={t('acceptInvite.documentNumber')}
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder={t('acceptInvite.documentPlaceholder')}
              error={formErrors.documentNumber}
            />
          </Card>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              title={submitting ? t('acceptInvite.accepting') : t('acceptInvite.acceptButton')}
              onPress={handleAccept}
              disabled={submitting}
              style={styles.acceptButton}
            />
            <Button
              title={t('acceptInvite.declineButton')}
              variant="secondary"
              onPress={handleDecline}
              disabled={submitting}
              style={styles.declineButton}
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
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    minWidth: 150,
  },
  invitationCard: {
    padding: 20,
    marginBottom: 16,
  },
  invitationHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  invitationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  roleBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
  messageContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  messageLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
  },
  formCard: {
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
    marginTop: 8,
  },
  documentTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  documentTypeButton: {
    flex: 1,
    minWidth: 70,
  },
  actionButtons: {
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  declineButton: {
    borderColor: '#F44336',
  },
});



