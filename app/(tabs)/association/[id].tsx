import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getAssociation, 
  getAssociationMembers,
  getMemberByUserId,
} from '../../../firebase/associations';
import { Association, Member, MemberRole } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';

const ROLE_COLORS: Record<MemberRole, string> = {
  owner: '#9C27B0',
  admin: '#2196F3',
  cultivator: '#4CAF50',
  patient: '#FF9800',
  volunteer: '#607D8B',
};

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  inactive: '#9E9E9E',
  pending_approval: '#FF9800',
};

export default function AssociationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [association, setAssociation] = useState<Association | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData, currentAssociation, switchAssociation } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  const loadData = async () => {
    if (!id || !userData) {
      setLoading(false);
      return;
    }

    try {
      const [assoc, membersList, userMember] = await Promise.all([
        getAssociation(id),
        getAssociationMembers(id),
        getMemberByUserId(userData.uid, id),
      ]);
      
      setAssociation(assoc);
      setMembers(membersList);
      setCurrentMember(userMember);
    } catch (error: any) {
      console.error('[AssociationDetails] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, userData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSwitchToThis = async () => {
    if (!id) return;
    
    try {
      await switchAssociation(id);
      const alertMessage = t('switchedSuccess');
      if (Platform.OS === 'web') {
        window.alert(alertMessage);
      } else {
        Alert.alert(t('success'), alertMessage);
      }
    } catch (error: any) {
      const alertMessage = error.message || t('switchError');
      if (Platform.OS === 'web') {
        window.alert(alertMessage);
      } else {
        Alert.alert(t('error'), alertMessage);
      }
    }
  };

  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isCurrentAssociation = currentAssociation?.id === id;

  if (loading) {
    return <Loading />;
  }

  if (!association) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color="#f44336" />
          <Text style={styles.errorTitle}>{t('notFound')}</Text>
          <Button
            title={t('goBack')}
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  // Count members by role
  const membersByRole = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
      >
        {/* Header Card */}
        <Card style={styles.headerCard}>
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <Ionicons name="business" size={40} color="#4CAF50" />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.associationName}>{association.name}</Text>
              <Text style={styles.legalName}>{association.legalName}</Text>
              {association.cnpj && (
                <Text style={styles.cnpj}>CNPJ: {association.cnpj}</Text>
              )}
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[association.status] + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[association.status] }]} />
              <Text style={[styles.statusText, { color: STATUS_COLORS[association.status] }]}>
                {t(`status.${association.status}`)}
              </Text>
            </View>
            
            {isCurrentAssociation ? (
              <View style={styles.currentBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={styles.currentText}>{t('current')}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.switchButton}
                onPress={handleSwitchToThis}
              >
                <Ionicons name="swap-horizontal" size={16} color="#4CAF50" />
                <Text style={styles.switchText}>{t('switchTo')}</Text>
              </TouchableOpacity>
            )}
          </View>

          {currentMember && (
            <View style={styles.yourRole}>
              <Text style={styles.yourRoleLabel}>{t('yourRole')}</Text>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[currentMember.role] + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[currentMember.role] }]}>
                  {t(`roles.${currentMember.role}`)}
                </Text>
              </View>
            </View>
          )}
        </Card>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <Card style={styles.statCard}>
            <Ionicons name="people" size={24} color="#2196F3" />
            <Text style={styles.statNumber}>{members.length}</Text>
            <Text style={styles.statLabel}>{t('stats.members')}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{association.plantCounter}</Text>
            <Text style={styles.statLabel}>{t('stats.plants')}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Ionicons name="medkit" size={24} color="#FF9800" />
            <Text style={styles.statNumber}>{association.patientCounter}</Text>
            <Text style={styles.statLabel}>{t('stats.patients')}</Text>
          </Card>
        </View>

        {/* Contact Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="call" size={20} color="#4CAF50" />
            <Text style={styles.cardTitle}>{t('contactInfo')}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{association.contactEmail}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color="#666" />
            <Text style={styles.infoText}>{association.contactPhone}</Text>
          </View>
          {association.website && (
            <View style={styles.infoRow}>
              <Ionicons name="globe-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{association.website}</Text>
            </View>
          )}
        </Card>

        {/* Address */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="location" size={20} color="#4CAF50" />
            <Text style={styles.cardTitle}>{t('addressInfo')}</Text>
          </View>
          
          <Text style={styles.addressText}>{association.address}</Text>
          <Text style={styles.addressText}>
            {association.city}, {association.state} {association.postalCode}
          </Text>
          <Text style={styles.addressText}>{association.country}</Text>
        </Card>

        {/* Responsible Person */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color="#4CAF50" />
            <Text style={styles.cardTitle}>{t('responsiblePerson')}</Text>
          </View>
          
          <View style={styles.responsibleInfo}>
            <Text style={styles.responsibleName}>{association.responsiblePersonName}</Text>
            <Text style={styles.responsibleRole}>{association.responsiblePersonRole}</Text>
          </View>
        </Card>

        {/* Members Summary */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="people" size={20} color="#4CAF50" />
            <Text style={styles.cardTitle}>{t('members.title')}</Text>
            {isOwnerOrAdmin && (
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => router.push(`/(tabs)/association/members?id=${id}`)}
              >
                <Text style={styles.viewAllText}>{t('viewAll')}</Text>
                <Ionicons name="chevron-forward" size={16} color="#4CAF50" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.membersGrid}>
            {Object.entries(ROLE_COLORS).map(([role, color]) => (
              <View key={role} style={styles.memberCount}>
                <View style={[styles.memberCountBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.memberCountNumber, { color }]}>
                    {membersByRole[role] || 0}
                  </Text>
                </View>
                <Text style={styles.memberCountLabel}>{t(`roles.${role}`)}</Text>
              </View>
            ))}
          </View>

          {isOwnerOrAdmin && (
            <Button
              title={t('invite.title')}
              onPress={() => router.push(`/(tabs)/association/invite?id=${id}`)}
              style={styles.inviteButton}
            />
          )}
        </Card>

        {/* Authorization Info */}
        {association.anvisaAuthorization && (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="document-text" size={20} color="#4CAF50" />
              <Text style={styles.cardTitle}>{t('authorization')}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ANVISA:</Text>
              <Text style={styles.infoValue}>{association.anvisaAuthorization}</Text>
            </View>
          </Card>
        )}

        {/* Actions */}
        {isOwnerOrAdmin && (
          <View style={styles.actions}>
            <Button
              title={t('editAssociation')}
              variant="secondary"
              onPress={() => router.push(`/(tabs)/association/edit?id=${id}`)}
            />
          </View>
        )}

        {/* Meta Info */}
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>
            {t('createdAt')}: {format(association.createdAt, 'dd/MM/yyyy')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 24,
  },
  headerCard: {
    padding: 16,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  associationName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  legalName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cnpj: {
    fontSize: 13,
    color: '#999',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  currentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  yourRole: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  yourRoleLabel: {
    fontSize: 14,
    color: '#666',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  addressText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  responsibleInfo: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  responsibleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  responsibleRole: {
    fontSize: 14,
    color: '#666',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  memberCount: {
    alignItems: 'center',
    width: '30%',
  },
  memberCountBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  memberCountNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  memberCountLabel: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
  },
  inviteButton: {
    marginTop: 8,
  },
  actions: {
    marginBottom: 16,
  },
  metaInfo: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#999',
  },
});





