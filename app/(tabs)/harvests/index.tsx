import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserHarvests, getPlant } from '../../../firebase/firestore';
import { Harvest, HarvestStatus, HarvestPurpose, Plant } from '../../../types';
import { Card } from '../../../components/Card';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const HARVEST_STATUS_LABELS: Record<HarvestStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  fresh: { label: 'Fresh', color: '#4CAF50', icon: 'leaf' },
  drying: { label: 'Drying', color: '#FF9800', icon: 'sunny' },
  curing: { label: 'Curing', color: '#9C27B0', icon: 'time' },
  processed: { label: 'Processed', color: '#2196F3', icon: 'checkmark-circle' },
  distributed: { label: 'Distributed', color: '#607D8B', icon: 'gift' },
};

const HARVEST_PURPOSE_LABELS: Record<HarvestPurpose, string> = {
  patient: 'Patient',
  research: 'Research',
  extract: 'Extract',
  personal: 'Personal',
  donation: 'Donation',
  other: 'Other',
};

type FilterType = 'all' | HarvestStatus;

interface HarvestWithPlant extends Harvest {
  plant?: Plant;
}

export default function HarvestsScreen() {
  const [harvests, setHarvests] = useState<HarvestWithPlant[]>([]);
  const [filteredHarvests, setFilteredHarvests] = useState<HarvestWithPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const harvestsData = await getUserHarvests(userData.uid);
      
      // Load plant info for each harvest
      const harvestsWithPlants = await Promise.all(
        harvestsData.map(async (harvest) => {
          try {
            const plant = await getPlant(harvest.plantId);
            return { ...harvest, plant: plant || undefined };
          } catch {
            return { ...harvest, plant: undefined };
          }
        })
      );
      
      setHarvests(harvestsWithPlants);
      applyFilter(harvestsWithPlants, activeFilter);
    } catch (error: any) {
      console.error('[HarvestsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (data: HarvestWithPlant[], filter: FilterType) => {
    if (filter === 'all') {
      setFilteredHarvests(data);
    } else {
      setFilteredHarvests(data.filter(h => h.status === filter));
    }
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
    applyFilter(harvests, filter);
  };

  // Calculate inventory stats
  const getAvailableWeight = (harvest: Harvest): number => {
    // Use the best available weight, ensuring it's positive
    let totalWeight = 0;
    if (harvest.finalWeightGrams && harvest.finalWeightGrams > 0) {
      totalWeight = harvest.finalWeightGrams;
    } else if (harvest.dryWeightGrams && harvest.dryWeightGrams > 0) {
      totalWeight = harvest.dryWeightGrams;
    } else if (harvest.wetWeightGrams && harvest.wetWeightGrams > 0) {
      totalWeight = harvest.wetWeightGrams;
    }
    return Math.max(0, totalWeight - (harvest.distributedGrams || 0) - (harvest.extractedGrams || 0));
  };

  const getDisplayWeight = (harvest: Harvest): number => {
    if (harvest.finalWeightGrams && harvest.finalWeightGrams > 0) return harvest.finalWeightGrams;
    if (harvest.dryWeightGrams && harvest.dryWeightGrams > 0) return harvest.dryWeightGrams;
    if (harvest.wetWeightGrams && harvest.wetWeightGrams > 0) return harvest.wetWeightGrams;
    return 0;
  };

  const inventoryStats = {
    totalHarvests: harvests.length,
    inDrying: harvests
      .filter(h => h.status === 'drying')
      .reduce((sum, h) => sum + Math.max(0, h.dryWeightGrams || h.wetWeightGrams || 0), 0),
    inCuring: harvests
      .filter(h => h.status === 'curing')
      .reduce((sum, h) => sum + getAvailableWeight(h), 0),
    available: harvests
      .filter(h => h.status === 'curing' || h.status === 'processed')
      .reduce((sum, h) => sum + getAvailableWeight(h), 0),
    distributed: harvests.reduce((sum, h) => sum + Math.max(0, h.distributedGrams || 0), 0),
    extracted: harvests.reduce((sum, h) => sum + Math.max(0, h.extractedGrams || 0), 0),
  };

  const renderHarvest = ({ item }: { item: HarvestWithPlant }) => {
    const statusInfo = HARVEST_STATUS_LABELS[item.status];
    const availableWeight = getAvailableWeight(item);
    const totalWeight = getDisplayWeight(item);

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/harvests/${item.id}`)}>
        <Card style={styles.harvestCard}>
          <View style={styles.harvestHeader}>
            <View style={[styles.statusIcon, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon} size={24} color={statusInfo.color} />
            </View>
            <View style={styles.harvestInfo}>
              <Text style={styles.controlNumber}>#{item.controlNumber}</Text>
              {item.plant && (
                <Text style={styles.plantName}>{item.plant.strain}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
              <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
            </View>
          </View>

          <View style={styles.harvestDetails}>
            {/* Weight Progress */}
            <View style={styles.weightSection}>
              <View style={styles.weightRow}>
                <View style={styles.weightItem}>
                  <Text style={styles.weightLabel}>Wet</Text>
                  <Text style={styles.weightValue}>{item.wetWeightGrams}g</Text>
                </View>
                {item.dryWeightGrams !== undefined && item.dryWeightGrams > 0 && (
                  <>
                    <Ionicons name="arrow-forward" size={16} color="#ccc" />
                    <View style={styles.weightItem}>
                      <Text style={styles.weightLabel}>Dry</Text>
                      <Text style={styles.weightValue}>{item.dryWeightGrams}g</Text>
                    </View>
                  </>
                )}
                {item.finalWeightGrams !== undefined && item.finalWeightGrams > 0 && (
                  <>
                    <Ionicons name="arrow-forward" size={16} color="#ccc" />
                    <View style={styles.weightItem}>
                      <Text style={styles.weightLabel}>Final</Text>
                      <Text style={styles.weightValue}>{item.finalWeightGrams}g</Text>
                    </View>
                  </>
                )}
              </View>
            </View>

            {/* Available inventory */}
            {(item.status === 'curing' || item.status === 'processed') && (
              <View style={styles.availableRow}>
                <Ionicons name="cube" size={16} color="#4CAF50" />
                <Text style={styles.availableText}>
                  Available: <Text style={styles.availableValue}>{availableWeight}g</Text>
                  {availableWeight < totalWeight && (
                    <Text style={styles.usedText}> (used: {totalWeight - availableWeight}g)</Text>
                  )}
                </Text>
              </View>
            )}

            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {format(new Date(item.harvestDate), 'MMM dd, yyyy')}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="flag-outline" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {HARVEST_PURPOSE_LABELS[item.purpose]}
                </Text>
              </View>
              {item.qualityGrade && (
                <View style={styles.gradeBadge}>
                  <Text style={styles.gradeText}>Grade {item.qualityGrade}</Text>
                </View>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message="Loading inventory..." />;
  }

  const filterOptions: { value: FilterType; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: harvests.length },
    { value: 'drying', label: 'Drying', count: harvests.filter(h => h.status === 'drying').length },
    { value: 'curing', label: 'Curing', count: harvests.filter(h => h.status === 'curing').length },
    { value: 'processed', label: 'Processed', count: harvests.filter(h => h.status === 'processed').length },
    { value: 'distributed', label: 'Distributed', count: harvests.filter(h => h.status === 'distributed').length },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Inventory Summary */}
      <View style={styles.inventorySummary}>
        <Text style={styles.inventoryTitle}>Inventory Summary</Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.statDrying]}>
            <Ionicons name="sunny" size={20} color="#FF9800" />
            <Text style={styles.statValue}>{inventoryStats.inDrying.toFixed(0)}g</Text>
            <Text style={styles.statLabel}>Drying</Text>
          </View>
          <View style={[styles.statCard, styles.statCuring]}>
            <Ionicons name="time" size={20} color="#9C27B0" />
            <Text style={styles.statValue}>{inventoryStats.inCuring.toFixed(0)}g</Text>
            <Text style={styles.statLabel}>Curing</Text>
          </View>
          <View style={[styles.statCard, styles.statAvailable]}>
            <Ionicons name="cube" size={20} color="#4CAF50" />
            <Text style={[styles.statValue, styles.statValueHighlight]}>{inventoryStats.available.toFixed(0)}g</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={[styles.statCard, styles.statDistributed]}>
            <Ionicons name="gift" size={20} color="#607D8B" />
            <Text style={styles.statValue}>{inventoryStats.distributed.toFixed(0)}g</Text>
            <Text style={styles.statLabel}>Distributed</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContainer}
      >
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterTab,
              activeFilter === filter.value && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(filter.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter.value && styles.filterTabTextActive,
              ]}
            >
              {filter.label} ({filter.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {filteredHarvests.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {harvests.length === 0 ? 'No harvests yet' : 'No harvests match this filter'}
            </Text>
            <Text style={styles.emptySubtext}>
              {harvests.length === 0
                ? 'Harvest your plants to add them to inventory'
                : 'Try selecting a different filter'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredHarvests}
            keyExtractor={(item) => item.id}
            renderItem={renderHarvest}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Inventory Summary
  inventorySummary: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  inventoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statDrying: {
    backgroundColor: '#FFF3E0',
  },
  statCuring: {
    backgroundColor: '#F3E5F5',
  },
  statAvailable: {
    backgroundColor: '#E8F5E9',
  },
  statDistributed: {
    backgroundColor: '#ECEFF1',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 6,
  },
  statValueHighlight: {
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  // Filter
  filterScroll: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    maxHeight: 52,
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: '#4CAF50',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  // Content
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  // Harvest Card
  harvestCard: {
    marginBottom: 8,
  },
  harvestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  harvestInfo: {
    flex: 1,
  },
  controlNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    fontFamily: 'monospace',
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  harvestDetails: {
    gap: 10,
  },
  // Weight Section
  weightSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
  },
  weightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  weightItem: {
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  weightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  // Available Row
  availableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  availableText: {
    fontSize: 14,
    color: '#333',
  },
  availableValue: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  usedText: {
    color: '#999',
    fontSize: 12,
  },
  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  gradeBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gradeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  // Empty State
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
});

