import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserAssociations, getPendingInvitationsForUser, rejectInvitation } from '../../../firebase/associations';
import { Association, AssociationInvitation } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

const STATUS_COLORS: Record<string, string> = {
  active: '#4CAF50',
  inactive: '#9E9E9E',
  pending_approval: '#FF9800',
};

export default function AssociationsScreen() {
  const [associations, setAssociations] = useState<Association[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<AssociationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData, currentAssociation, switchAssociation, refreshAssociation } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  const loadData = async () => {
    if (!userData) {
      console.log('[AssociationsScreen] No userData, skipping load');
      setLoading(false);
      return;
    }

    console.log('[AssociationsScreen] Loading data for user:', userData.email);

    try {
      const [assocs, invitations] = await Promise.all([
        getUserAssociations(userData.uid),
        getPendingInvitationsForUser(userData.email),
      ]);
      
      console.log('[AssociationsScreen] Loaded associations:', assocs.length);
      console.log('[AssociationsScreen] Loaded pending invitations:', invitations.length, invitations);
      
      // If no associations found but currentAssociation exists, add it to the list
      // This handles cases where the user document wasn't properly updated
      let finalAssocs = assocs;
      if (assocs.length === 0 && currentAssociation) {
        finalAssocs = [currentAssociation];
      } else if (assocs.length > 0 && currentAssociation) {
        // Make sure currentAssociation is in the list
        const hasCurrentAssociation = assocs.some(a => a.id === currentAssociation.id);
        if (!hasCurrentAssociation) {
          finalAssocs = [currentAssociation, ...assocs];
        }
      }
      
      setAssociations(finalAssocs);
      setPendingInvitations(invitations);
    } catch (error: any) {
      console.error('[AssociationsScreen] Error loading data:', error);
      // If there's an error but we have currentAssociation, show it
      if (currentAssociation) {
        setAssociations([currentAssociation]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userData, currentAssociation])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSwitchAssociation = async (associationId: string) => {
    try {
      await switchAssociation(associationId);
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

  const handleDeclineInvitation = async (invitationId: string) => {
    const confirmDecline = () => {
      return new Promise<boolean>((resolve) => {
        if (Platform.OS === 'web') {
          resolve(window.confirm(t('declineConfirm')));
        } else {
          Alert.alert(
            t('declineTitle'),
            t('declineConfirm'),
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

    try {
      await rejectInvitation(invitationId);
      // Refresh the list
      await loadData();
      
      const successMessage = t('declineSuccess');
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('declineError');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    }
  };

  const renderAssociation = ({ item }: { item: Association }) => {
    const isActive = currentAssociation?.id === item.id;

    return (
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/association/${item.id}`)}
        activeOpacity={0.7}
      >
        <Card style={[styles.associationCard, isActive && styles.activeCard]}>
          <View style={styles.cardHeader}>
            <View style={styles.logoContainer}>
              {item.logoUrl ? (
                <Text style={styles.logoText}>{item.name.charAt(0).toUpperCase()}</Text>
              ) : (
                <Ionicons name="business" size={32} color="#4CAF50" />
              )}
            </View>
            <View style={styles.cardInfo}>
              <Text style={styles.associationName}>{item.name}</Text>
              <Text style={styles.associationLegal}>{item.legalName}</Text>
              {item.cnpj && (
                <Text style={styles.cnpj}>CNPJ: {item.cnpj}</Text>
              )}
            </View>
            {isActive && (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.activeText}>{t('current')}</Text>
              </View>
            )}
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.city}, {item.state}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '20' }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
                {t(`status.${item.status}`)}
              </Text>
            </View>
          </View>

          {!isActive && (
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => handleSwitchAssociation(item.id)}
            >
              <Ionicons name="swap-horizontal" size={18} color="#4CAF50" />
              <Text style={styles.switchButtonText}>{t('switchTo')}</Text>
            </TouchableOpacity>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  const renderInvitation = ({ item }: { item: AssociationInvitation }) => (
    <Card style={styles.invitationCard}>
      <View style={styles.invitationHeader}>
        <Ionicons name="mail-outline" size={24} color="#FF9800" />
        <View style={styles.invitationInfo}>
          <Text style={styles.invitationTitle}>{t('invitedTo')}</Text>
          <Text style={styles.invitationName}>{item.associationName}</Text>
          <Text style={styles.invitationFrom}>
            {t('invitedBy')}: {item.invitedByName}
          </Text>
          <Text style={styles.invitationRole}>
            {t('role')}: {t(`roles.${item.invitedRole}`)}
          </Text>
        </View>
      </View>
      <View style={styles.invitationActions}>
        <Button
          title={t('accept')}
          onPress={() => router.push(`/(tabs)/association/accept-invite?id=${item.id}`)}
          style={styles.acceptButton}
        />
        <Button
          title={t('decline')}
          variant="secondary"
          onPress={() => handleDeclineInvitation(item.id)}
          style={styles.declineButton}
        />
      </View>
    </Card>
  );

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Current Association Banner */}
      {currentAssociation && (
        <View style={styles.currentBanner}>
          <View style={styles.bannerContent}>
            <Ionicons name="business" size={24} color="#fff" />
            <View style={styles.bannerText}>
              <Text style={styles.bannerLabel}>{t('workingAs')}</Text>
              <Text style={styles.bannerName}>{currentAssociation.name}</Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={[
          ...(pendingInvitations.length > 0 ? [{ type: 'invitations' }] : []),
          ...associations.map(a => ({ type: 'association', data: a })),
        ]}
        keyExtractor={(item: any, index) => 
          item.type === 'invitations' ? 'invitations' : item.data.id
        }
        renderItem={({ item }: any) => {
          if (item.type === 'invitations') {
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('pendingInvitations')}</Text>
                {pendingInvitations.map(inv => (
                  <View key={inv.id}>{renderInvitation({ item: inv })}</View>
                ))}
              </View>
            );
          }
          return renderAssociation({ item: item.data });
        }}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListHeaderComponent={
          associations.length > 0 ? (
            <Text style={styles.sectionTitle}>{t('myAssociations')}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="business-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('noAssociations')}</Text>
            <Text style={styles.emptyText}>{t('noAssociationsDesc')}</Text>
            <Button
              title={t('createAssociation')}
              onPress={() => router.push('/(tabs)/association/new')}
              style={styles.createButton}
            />
          </View>
        }
      />

      {associations.length > 0 && (
        <View style={styles.footer}>
          <Button
            title={t('createAssociation')}
            onPress={() => router.push('/(tabs)/association/new')}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  currentBanner: {
    backgroundColor: '#4CAF50',
    padding: 16,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bannerText: {
    flex: 1,
  },
  bannerLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  bannerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  associationCard: {
    marginBottom: 12,
    padding: 16,
  },
  activeCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  cardInfo: {
    flex: 1,
  },
  associationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  associationLegal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  cnpj: {
    fontSize: 12,
    color: '#999',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  switchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  invitationCard: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationTitle: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    marginBottom: 2,
  },
  invitationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  invitationFrom: {
    fontSize: 13,
    color: '#666',
  },
  invitationRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
  },
  declineButton: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  createButton: {
    minWidth: 200,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
});


