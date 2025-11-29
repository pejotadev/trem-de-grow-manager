import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserDistributions, getUserPatients } from '../../../firebase/firestore';
import { Distribution, ProductType, Patient } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const PRODUCT_TYPE_LABELS: Record<ProductType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  flower: { label: 'Flower', icon: 'leaf', color: '#4CAF50' },
  extract: { label: 'Extract', icon: 'flask', color: '#FF9800' },
  oil: { label: 'Oil', icon: 'water', color: '#2196F3' },
  edible: { label: 'Edible', icon: 'nutrition', color: '#E91E63' },
  topical: { label: 'Topical', icon: 'hand-left', color: '#9C27B0' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#607D8B' },
};

type FilterType = 'all' | 'thisMonth' | 'patient';

export default function DistributionsScreen() {
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [filteredDistributions, setFilteredDistributions] = useState<Distribution[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const [distributionsData, patientsData] = await Promise.all([
        getUserDistributions(userData.uid),
        getUserPatients(userData.uid),
      ]);
      setDistributions(distributionsData);
      setPatients(patientsData);
      applyFilters(distributionsData, activeFilter, selectedPatientId);
    } catch (error: any) {
      console.error('[DistributionsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (data: Distribution[], filter: FilterType, patientId: string | null) => {
    let result = data;

    if (filter === 'thisMonth') {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      result = result.filter(d =>
        isWithinInterval(new Date(d.distributionDate), { start: monthStart, end: monthEnd })
      );
    } else if (filter === 'patient' && patientId) {
      result = result.filter(d => d.patientId === patientId);
    }

    setFilteredDistributions(result);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [userData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    if (filter === 'patient') {
      setPatientModalVisible(true);
    } else {
      setSelectedPatientId(null);
      applyFilters(distributions, filter, null);
    }
  };

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setPatientModalVisible(false);
    applyFilters(distributions, 'patient', patientId);
  };

  // Calculate stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  
  const thisMonthDistributions = distributions.filter(d =>
    isWithinInterval(new Date(d.distributionDate), { start: monthStart, end: monthEnd })
  );
  
  const totalGramsThisMonth = thisMonthDistributions.reduce((sum, d) => sum + (d.quantityGrams || 0), 0);
  const uniquePatientsThisMonth = new Set(thisMonthDistributions.map(d => d.patientId)).size;

  const getQuantityDisplay = (distribution: Distribution): string => {
    const parts: string[] = [];
    if (distribution.quantityGrams) parts.push(`${distribution.quantityGrams}g`);
    if (distribution.quantityMl) parts.push(`${distribution.quantityMl}ml`);
    if (distribution.quantityUnits) parts.push(`${distribution.quantityUnits} units`);
    return parts.join(' • ') || 'N/A';
  };

  const renderDistribution = ({ item }: { item: Distribution }) => {
    const productInfo = PRODUCT_TYPE_LABELS[item.productType];

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/distributions/${item.id}`)}>
        <Card style={styles.distributionCard}>
          <View style={styles.distributionHeader}>
            <View style={[styles.productIcon, { backgroundColor: productInfo.color + '20' }]}>
              <Ionicons name={productInfo.icon} size={24} color={productInfo.color} />
            </View>
            <View style={styles.distributionInfo}>
              <Text style={styles.distributionNumber}>#{item.distributionNumber}</Text>
              <Text style={styles.patientName}>{item.patientName}</Text>
            </View>
            <View style={[styles.productBadge, { backgroundColor: productInfo.color }]}>
              <Text style={styles.productBadgeText}>{productInfo.label}</Text>
            </View>
          </View>

          <View style={styles.distributionDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {format(new Date(item.distributionDate), 'MMM dd, yyyy')}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="scale-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{getQuantityDisplay(item)}</Text>
            </View>

            {item.harvestControlNumber && (
              <View style={styles.detailRow}>
                <Ionicons name="leaf-outline" size={16} color="#666" />
                <Text style={styles.detailText}>Harvest: {item.harvestControlNumber}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={16} color="#666" />
              <Text style={styles.detailText}>Received by: {item.receivedBy}</Text>
            </View>
          </View>

          {item.signatureConfirmation && (
            <View style={styles.signedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.signedText}>Signature confirmed</Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message="Loading distributions..." />;
  }

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  return (
    <SafeAreaView style={styles.container}>
      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="gift" size={24} color="#7B1FA2" />
          <Text style={styles.statValue}>{totalGramsThisMonth}g</Text>
          <Text style={styles.statLabel}>Distributed this month</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#7B1FA2" />
          <Text style={styles.statValue}>{uniquePatientsThisMonth}</Text>
          <Text style={styles.statLabel}>Patients served</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'all' && styles.filterTabActive]}
          onPress={() => handleFilterChange('all')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'all' && styles.filterTabTextActive]}>
            All ({distributions.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'thisMonth' && styles.filterTabActive]}
          onPress={() => handleFilterChange('thisMonth')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'thisMonth' && styles.filterTabTextActive]}>
            This Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, activeFilter === 'patient' && styles.filterTabActive]}
          onPress={() => handleFilterChange('patient')}
        >
          <Text style={[styles.filterTabText, activeFilter === 'patient' && styles.filterTabTextActive]}>
            {selectedPatient ? selectedPatient.name.split(' ')[0] : 'By Patient'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={activeFilter === 'patient' ? '#7B1FA2' : '#999'} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {filteredDistributions.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="gift-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {distributions.length === 0 ? 'No distributions yet' : 'No distributions match your filter'}
            </Text>
            <Text style={styles.emptySubtext}>
              {distributions.length === 0
                ? 'Distribute products to patients from harvest details'
                : 'Try adjusting your filters'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDistributions}
            keyExtractor={(item) => item.id}
            renderItem={renderDistribution}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={styles.fabSecondary}
          onPress={() => router.push('/(tabs)/distributions/order')}
        >
          <Ionicons name="cart" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(tabs)/distributions/new')}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Patient Selection Modal */}
      <Modal
        visible={patientModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setPatientModalVisible(false);
          if (!selectedPatientId) {
            setActiveFilter('all');
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Patient</Text>
            <ScrollView>
              {patients.length === 0 ? (
                <Text style={styles.emptyText}>No patients registered</Text>
              ) : (
                patients.map((patient) => (
                  <TouchableOpacity
                    key={patient.id}
                    style={styles.patientOption}
                    onPress={() => handlePatientSelect(patient.id)}
                  >
                    <View style={styles.patientAvatar}>
                      <Ionicons name="person" size={20} color="#fff" />
                    </View>
                    <Text style={styles.patientOptionText}>{patient.name}</Text>
                    {selectedPatientId === patient.id && (
                      <Ionicons name="checkmark" size={24} color="#7B1FA2" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => {
                setPatientModalVisible(false);
                if (!selectedPatientId) {
                  setActiveFilter('all');
                }
              }}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B1FA2',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingHorizontal: 8,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#7B1FA2',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  filterTabTextActive: {
    color: '#7B1FA2',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  distributionCard: {
    marginBottom: 4,
  },
  distributionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  productIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  distributionInfo: {
    flex: 1,
  },
  distributionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7B1FA2',
    fontFamily: 'monospace',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  productBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  distributionDetails: {
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  signedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  patientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  patientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  patientOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  // FAB styles
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});


