import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { createInvitation, getAssociation } from '../../../firebase/associations';
import { checkUserExistsByEmail, createInvitedUserSimple, getPasswordFromEmail } from '../../../firebase/auth';
import { MemberRole } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Simple debounce function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

const ROLES: MemberRole[] = ['admin', 'cultivator', 'patient', 'volunteer'];

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#9C27B0',
  admin: '#2196F3',
  cultivator: '#4CAF50',
  patient: '#FF9800',
  volunteer: '#607D8B',
};

const ROLE_ICONS: Record<MemberRole, keyof typeof Ionicons.glyphMap> = {
  owner: 'shield',
  admin: 'key',
  cultivator: 'leaf',
  patient: 'medkit',
  volunteer: 'hand-left',
};

export default function InviteMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const { userData, currentAssociation, logout } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  // Form state
  const [email, setEmail] = useState('');
  const [selectedRole, setSelectedRole] = useState<MemberRole>('cultivator');
  const [message, setMessage] = useState('');
  
  // User existence check
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [createAccountForUser, setCreateAccountForUser] = useState(false);

  // Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Debounced email check
  const checkEmail = useCallback(
    debounce(async (emailToCheck: string) => {
      if (!emailToCheck || !emailToCheck.includes('@')) {
        setUserExists(null);
        return;
      }

      setCheckingEmail(true);
      try {
        const result = await checkUserExistsByEmail(emailToCheck.trim());
        setUserExists(result.exists);
        // If user exists, we don't need to create an account
        if (result.exists) {
          setCreateAccountForUser(false);
        }
      } catch (error) {
        console.error('[InviteMember] Error checking email:', error);
        setUserExists(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 500),
    []
  );

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    setUserExists(null);
    checkEmail(newEmail);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = t('invite.errors.emailRequired');
    } else if (!email.includes('@')) {
      newErrors.email = t('invite.errors.emailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    if (!userData || !id) return;

    setLoading(true);

    try {
      const association = await getAssociation(id);
      if (!association) {
        throw new Error('Association not found');
      }

      // If user doesn't exist and we need to create an account
      if (userExists === false && createAccountForUser) {
        setCreatingUser(true);
        
        try {
          const { tempPassword } = await createInvitedUserSimple(email.trim());
          
          // Show the credentials to the inviter
          const credentialsMessage = t('invite.userCreated', { 
            email: email.trim(), 
            password: tempPassword 
          });
          
          if (Platform.OS === 'web') {
            window.alert(credentialsMessage);
          } else {
            Alert.alert(t('invite.userCreatedTitle'), credentialsMessage);
          }
        } catch (createError: any) {
          console.error('[InviteMember] Error creating user:', createError);
          throw new Error(t('invite.createUserError') + ': ' + createError.message);
        } finally {
          setCreatingUser(false);
        }
      }

      await createInvitation({
        associationId: id,
        associationName: association.name,
        invitedEmail: email.trim().toLowerCase(),
        invitedRole: selectedRole,
        invitedBy: userData.uid,
        invitedByName: userData.displayName || userData.email,
        message: message.trim() || undefined,
      });

      // If we created a user, we need to log out and let the inviter log back in
      if (userExists === false && createAccountForUser) {
        const logoutMessage = t('invite.successWithLogout', { email: email.trim() });
        if (Platform.OS === 'web') {
          window.alert(logoutMessage);
        } else {
          Alert.alert(t('success'), logoutMessage);
        }
        
        // Log out and redirect to login
        await logout();
        router.replace('/(auth)/login');
        return;
      }

      const successMessage = t('invite.success', { email: email.trim() });
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }

      router.back();
    } catch (error: any) {
      console.error('[InviteMember] Error:', error);
      const errorMessage = error.message || t('invite.error');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Info Card */}
          <Card style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <Ionicons name="information-circle" size={24} color="#2196F3" />
              <Text style={styles.infoTitle}>{t('invite.howItWorks')}</Text>
            </View>
            <Text style={styles.infoText}>
              {t('invite.howItWorksDesc')}
            </Text>
          </Card>

          {/* Email Input */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="mail" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('invite.emailTitle')}</Text>
            </View>

            <Input
              label={t('invite.email')}
              placeholder={t('invite.emailPlaceholder')}
              value={email}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            {/* Email check status */}
            {checkingEmail && (
              <View style={styles.emailStatus}>
                <ActivityIndicator size="small" color="#666" />
                <Text style={styles.emailStatusText}>{t('invite.checkingEmail')}</Text>
              </View>
            )}

            {!checkingEmail && userExists === true && (
              <View style={styles.emailStatusSuccess}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={styles.emailStatusTextSuccess}>{t('invite.userExists')}</Text>
              </View>
            )}

            {!checkingEmail && userExists === false && (
              <View style={styles.newUserContainer}>
                <View style={styles.emailStatusWarning}>
                  <Ionicons name="alert-circle" size={18} color="#FF9800" />
                  <Text style={styles.emailStatusTextWarning}>{t('invite.userNotExists')}</Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.createAccountOption,
                    createAccountForUser && styles.createAccountOptionSelected,
                  ]}
                  onPress={() => setCreateAccountForUser(!createAccountForUser)}
                >
                  <Ionicons 
                    name={createAccountForUser ? 'checkbox' : 'square-outline'} 
                    size={24} 
                    color={createAccountForUser ? '#4CAF50' : '#666'} 
                  />
                  <View style={styles.createAccountTextContainer}>
                    <Text style={styles.createAccountText}>{t('invite.createAccount')}</Text>
                    <Text style={styles.createAccountDesc}>
                      {t('invite.createAccountDesc', { password: getPasswordFromEmail(email) })}
                    </Text>
                  </View>
                </TouchableOpacity>

                {createAccountForUser && (
                  <View style={styles.warningCard}>
                    <Ionicons name="warning" size={20} color="#F44336" />
                    <Text style={styles.warningText}>{t('invite.logoutWarning')}</Text>
                  </View>
                )}
              </View>
            )}
          </Card>

          {/* Role Selection */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="shield-checkmark" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('invite.selectRole')}</Text>
            </View>

            <View style={styles.rolesGrid}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    selectedRole === role && styles.roleOptionSelected,
                    { borderColor: selectedRole === role ? ROLE_COLORS[role] : '#e0e0e0' },
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <View style={[
                    styles.roleIcon, 
                    { backgroundColor: ROLE_COLORS[role] + '20' }
                  ]}>
                    <Ionicons 
                      name={ROLE_ICONS[role]} 
                      size={24} 
                      color={ROLE_COLORS[role]} 
                    />
                  </View>
                  <Text style={[
                    styles.roleName,
                    selectedRole === role && { color: ROLE_COLORS[role] },
                  ]}>
                    {t(`roles.${role}`)}
                  </Text>
                  <Text style={styles.roleDesc}>
                    {t(`invite.roleDesc.${role}`)}
                  </Text>
                  {selectedRole === role && (
                    <View style={[styles.checkmark, { backgroundColor: ROLE_COLORS[role] }]}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Optional Message */}
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="chatbubble" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('invite.messageTitle')}</Text>
              <Text style={styles.optional}>{t('optional')}</Text>
            </View>

            <Input
              label={t('invite.message')}
              placeholder={t('invite.messagePlaceholder')}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Summary */}
          {email && (
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>{t('invite.summary')}</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('invite.inviting')}:</Text>
                <Text style={styles.summaryValue}>{email}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('invite.asRole')}:</Text>
                <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[selectedRole] + '20' }]}>
                  <Text style={[styles.roleBadgeText, { color: ROLE_COLORS[selectedRole] }]}>
                    {t(`roles.${selectedRole}`)}
                  </Text>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t('invite.to')}:</Text>
                <Text style={styles.summaryValue}>{currentAssociation?.name || '...'}</Text>
              </View>
            </Card>
          )}

          {/* Submit */}
          <View style={styles.submitContainer}>
            <Button
              title={loading ? t('invite.sending') : t('invite.send')}
              onPress={handleSubmit}
              disabled={loading}
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
  infoCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1565C0',
  },
  infoText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  optional: {
    fontSize: 12,
    color: '#999',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  roleOption: {
    width: '47%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
    position: 'relative',
  },
  roleOptionSelected: {
    backgroundColor: '#fafafa',
  },
  roleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitContainer: {
    marginTop: 8,
  },
  emailStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emailStatusText: {
    fontSize: 13,
    color: '#666',
  },
  emailStatusSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emailStatusTextSuccess: {
    fontSize: 13,
    color: '#4CAF50',
  },
  emailStatusWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emailStatusTextWarning: {
    fontSize: 13,
    color: '#FF9800',
  },
  newUserContainer: {
    marginTop: 4,
  },
  createAccountOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  createAccountOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  createAccountTextContainer: {
    flex: 1,
  },
  createAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  createAccountDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#C62828',
    lineHeight: 16,
  },
});


