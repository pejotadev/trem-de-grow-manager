import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  getAssociationMembers,
  getMemberByUserId,
  updateMemberRole,
  deactivateMember,
} from '../../../firebase/associations';
import { Member, MemberRole } from '../../../types';
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

const ROLE_ICONS: Record<MemberRole, keyof typeof Ionicons.glyphMap> = {
  owner: 'shield',
  admin: 'key',
  cultivator: 'leaf',
  patient: 'medkit',
  volunteer: 'hand-left',
};

type FilterType = 'all' | MemberRole;

export default function MembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [members, setMembers] = useState<Member[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { userData } = useAuth();
  const router = useRouter();
  const { t } = useTranslation('association');

  const loadData = async () => {
    if (!id || !userData) {
      setLoading(false);
      return;
    }

    try {
      const [membersList, userMember] = await Promise.all([
        getAssociationMembers(id, false), // Include inactive
        getMemberByUserId(userData.uid, id),
      ]);
      
      setMembers(membersList);
      setCurrentMember(userMember);
      applyFilter(membersList, activeFilter);
    } catch (error: any) {
      console.error('[MembersScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (data: Member[], filter: FilterType) => {
    if (filter === 'all') {
      setFilteredMembers(data);
    } else {
      setFilteredMembers(data.filter(m => m.role === filter));
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

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilter(members, filter);
  };

  const handleDeactivate = async (member: Member) => {
    const confirmMessage = t('members.confirmDeactivate', { name: member.fullName });
    
    const confirmed = Platform.OS === 'web'
      ? window.confirm(confirmMessage)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('confirm'),
            confirmMessage,
            [
              { text: t('cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('deactivate'), style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await deactivateMember(member.id);
      loadData();
      
      const successMessage = t('members.deactivateSuccess');
      if (Platform.OS === 'web') {
        window.alert(successMessage);
      } else {
        Alert.alert(t('success'), successMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || t('members.deactivateError');
      if (Platform.OS === 'web') {
        window.alert(errorMessage);
      } else {
        Alert.alert(t('error'), errorMessage);
      }
    }
  };

  const isOwnerOrAdmin = currentMember?.role === 'owner' || currentMember?.role === 'admin';
  const isOwner = currentMember?.role === 'owner';

  const getFilterCount = (filter: FilterType): number => {
    if (filter === 'all') return members.length;
    return members.filter(m => m.role === filter).length;
  };

  const renderMember = ({ item }: { item: Member }) => {
    const isCurrentUser = item.userId === userData?.uid;
    const canManage = isOwnerOrAdmin && !isCurrentUser && item.role !== 'owner';

    return (
      <Card style={[styles.memberCard, !item.isActive && styles.inactiveCard]}>
        <View style={styles.memberHeader}>
          <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
            <Ionicons 
              name={ROLE_ICONS[item.role]} 
              size={24} 
              color={ROLE_COLORS[item.role]} 
            />
          </View>
          <View style={styles.memberInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.memberName}>{item.fullName}</Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youText}>{t('you')}</Text>
                </View>
              )}
            </View>
            <Text style={styles.memberEmail}>{item.userEmail}</Text>
            <View style={styles.roleRow}>
              <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[item.role] + '20' }]}>
                <Text style={[styles.roleText, { color: ROLE_COLORS[item.role] }]}>
                  {t(`roles.${item.role}`)}
                </Text>
              </View>
              {!item.isActive && (
                <View style={styles.inactiveBadge}>
                  <Text style={styles.inactiveText}>{t('inactive')}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.memberDetails}>
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={14} color="#666" />
            <Text style={styles.detailText}>
              {t('members.joinedOn')}: {format(item.joinDate, 'dd/MM/yyyy')}
            </Text>
          </View>
          {item.invitedBy && (
            <View style={styles.detailItem}>
              <Ionicons name="person-add-outline" size={14} color="#666" />
              <Text style={styles.detailText}>
                {t('members.invitedBy')}: {item.invitedBy}
              </Text>
            </View>
          )}
        </View>

        {/* Permissions */}
        <View style={styles.permissions}>
          {item.canManagePlants && (
            <View style={styles.permissionBadge}>
              <Ionicons name="leaf" size={12} color="#4CAF50" />
            </View>
          )}
          {item.canManagePatients && (
            <View style={styles.permissionBadge}>
              <Ionicons name="medkit" size={12} color="#FF9800" />
            </View>
          )}
          {item.canManageDistributions && (
            <View style={styles.permissionBadge}>
              <Ionicons name="gift" size={12} color="#9C27B0" />
            </View>
          )}
          {item.canManageMembers && (
            <View style={styles.permissionBadge}>
              <Ionicons name="people" size={12} color="#2196F3" />
            </View>
          )}
          {item.canViewReports && (
            <View style={styles.permissionBadge}>
              <Ionicons name="bar-chart" size={12} color="#607D8B" />
            </View>
          )}
        </View>

        {canManage && item.isActive && (
          <View style={styles.memberActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {/* Show role change modal */}}
            >
              <Ionicons name="create-outline" size={18} color="#2196F3" />
              <Text style={[styles.actionText, { color: '#2196F3' }]}>{t('editRole')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeactivate(item)}
            >
              <Ionicons name="person-remove-outline" size={18} color="#f44336" />
              <Text style={[styles.actionText, { color: '#f44336' }]}>{t('deactivate')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={['all', 'owner', 'admin', 'cultivator', 'patient', 'volunteer'] as FilterType[]}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === item && styles.filterButtonActive,
              ]}
              onPress={() => handleFilterChange(item)}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === item && styles.filterTextActive,
                ]}
              >
                {item === 'all' ? t('all') : t(`roles.${item}`)} ({getFilterCount(item)})
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={filteredMembers}
        keyExtractor={(item) => item.id}
        renderItem={renderMember}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#4CAF50']}
            tintColor="#4CAF50"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>{t('members.noMembers')}</Text>
          </View>
        }
      />

      {isOwnerOrAdmin && (
        <View style={styles.footer}>
          <Button
            title={t('invite.title')}
            onPress={() => router.push(`/(tabs)/association/invite?id=${id}`)}
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
  filtersContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filters: {
    padding: 12,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  memberCard: {
    marginBottom: 12,
    padding: 16,
  },
  inactiveCard: {
    opacity: 0.6,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  youBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  youText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
  },
  memberEmail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inactiveBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  inactiveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f44336',
  },
  memberDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  permissions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  permissionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
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


