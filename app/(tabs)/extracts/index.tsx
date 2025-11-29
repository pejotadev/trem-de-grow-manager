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
import { getUserExtracts } from '../../../firebase/firestore';
import { Extract, ExtractType, ExtractionMethod } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { format, differenceInDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const EXTRACT_TYPE_LABELS: Record<ExtractType, { label: string; color: string }> = {
  oil: { label: 'Oil', color: '#FF9800' },
  tincture: { label: 'Tincture', color: '#4CAF50' },
  concentrate: { label: 'Concentrate', color: '#9C27B0' },
  isolate: { label: 'Isolate', color: '#2196F3' },
  full_spectrum: { label: 'Full Spectrum', color: '#E91E63' },
  broad_spectrum: { label: 'Broad Spectrum', color: '#00BCD4' },
  other: { label: 'Other', color: '#607D8B' },
};

const EXTRACTION_METHOD_LABELS: Record<ExtractionMethod, string> = {
  co2: 'CO₂',
  ethanol: 'Ethanol',
  butane: 'Butane',
  rosin: 'Rosin Press',
  ice_water: 'Ice Water',
  olive_oil: 'Olive Oil',
  other: 'Other',
};

type FilterType = 'all' | ExtractType;

export default function ExtractsScreen() {
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [filteredExtracts, setFilteredExtracts] = useState<Extract[]>([]);
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
      const extractsData = await getUserExtracts(userData.uid);
      setExtracts(extractsData);
      applyFilter(extractsData, activeFilter);
    } catch (error: any) {
      console.error('[ExtractsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (data: Extract[], filter: FilterType) => {
    if (filter === 'all') {
      setFilteredExtracts(data);
    } else {
      setFilteredExtracts(data.filter(e => e.extractType === filter));
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
    applyFilter(extracts, filter);
  };

  const getExpirationStatus = (extract: Extract): { label: string; color: string } | null => {
    if (!extract.expirationDate) return null;
    
    const daysUntilExpiration = differenceInDays(new Date(extract.expirationDate), new Date());
    
    if (daysUntilExpiration < 0) {
      return { label: 'Expired', color: '#f44336' };
    } else if (daysUntilExpiration <= 30) {
      return { label: `${daysUntilExpiration}d left`, color: '#FF9800' };
    } else if (daysUntilExpiration <= 90) {
      return { label: `${daysUntilExpiration}d left`, color: '#FFC107' };
    }
    return null;
  };

  const getQuantityDisplay = (extract: Extract): string => {
    const parts: string[] = [];
    if (extract.outputVolumeMl) parts.push(`${extract.outputVolumeMl}ml`);
    if (extract.outputWeightGrams) parts.push(`${extract.outputWeightGrams}g`);
    return parts.join(' / ') || 'N/A';
  };

  const renderExtract = ({ item }: { item: Extract }) => {
    const typeInfo = EXTRACT_TYPE_LABELS[item.extractType];
    const expirationStatus = getExpirationStatus(item);

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/extracts/${item.id}`)}>
        <Card style={styles.extractCard}>
          <View style={styles.extractHeader}>
            <View style={[styles.extractIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name="flask" size={24} color={typeInfo.color} />
            </View>
            <View style={styles.extractInfo}>
              <Text style={styles.extractNumber}>#{item.controlNumber}</Text>
              <Text style={styles.extractName}>{item.name}</Text>
            </View>
            <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
              <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
            </View>
          </View>

          <View style={styles.extractDetails}>
            <View style={styles.detailRow}>
              <Ionicons name="beaker-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{getQuantityDisplay(item)}</Text>
            </View>

            {(item.thcMgPerMl || item.cbdMgPerMl) && (
              <View style={styles.concentrationRow}>
                {item.thcMgPerMl && (
                  <View style={styles.concentrationBadge}>
                    <Text style={styles.concentrationLabel}>THC</Text>
                    <Text style={styles.concentrationValue}>{item.thcMgPerMl}mg/ml</Text>
                  </View>
                )}
                {item.cbdMgPerMl && (
                  <View style={[styles.concentrationBadge, styles.cbdBadge]}>
                    <Text style={styles.concentrationLabel}>CBD</Text>
                    <Text style={styles.concentrationValue}>{item.cbdMgPerMl}mg/ml</Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.detailRow}>
              <Ionicons name="leaf-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                {item.harvestIds.length} source harvest{item.harvestIds.length !== 1 ? 's' : ''}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color="#666" />
              <Text style={styles.detailText}>
                Extracted {format(new Date(item.extractionDate), 'MMM dd, yyyy')}
              </Text>
            </View>

            {item.extractionMethod && (
              <View style={styles.detailRow}>
                <Ionicons name="construct-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {EXTRACTION_METHOD_LABELS[item.extractionMethod]}
                </Text>
              </View>
            )}
          </View>

          {expirationStatus && (
            <View style={[styles.expirationBadge, { backgroundColor: expirationStatus.color + '20' }]}>
              <Ionicons name="time-outline" size={16} color={expirationStatus.color} />
              <Text style={[styles.expirationText, { color: expirationStatus.color }]}>
                {expirationStatus.label}
              </Text>
            </View>
          )}
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message="Loading extracts..." />;
  }

  const filterOptions: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'oil', label: 'Oil' },
    { value: 'tincture', label: 'Tincture' },
    { value: 'concentrate', label: 'Concentrate' },
    { value: 'isolate', label: 'Isolate' },
    { value: 'full_spectrum', label: 'Full Spec' },
    { value: 'broad_spectrum', label: 'Broad Spec' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <SafeAreaView style={styles.container}>
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
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={styles.content}>
        {filteredExtracts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flask-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {extracts.length === 0 ? 'No extracts yet' : 'No extracts match this filter'}
            </Text>
            <Text style={styles.emptySubtext}>
              {extracts.length === 0
                ? 'Create your first extract from harvested material'
                : 'Try selecting a different filter'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExtracts}
            keyExtractor={(item) => item.id}
            renderItem={renderExtract}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      {/* Add Extract Button */}
      <Button
        title="+ Create Extract"
        onPress={() => router.push('/(tabs)/extracts/new')}
        style={styles.addButton}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
    backgroundColor: '#FF5722',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  extractCard: {
    marginBottom: 4,
  },
  extractHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  extractIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  extractInfo: {
    flex: 1,
  },
  extractNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF5722',
    fontFamily: 'monospace',
  },
  extractName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  extractDetails: {
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
  concentrationRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 4,
  },
  concentrationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  cbdBadge: {
    backgroundColor: '#E3F2FD',
  },
  concentrationLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  concentrationValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
  },
  expirationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    gap: 6,
  },
  expirationText: {
    fontSize: 12,
    fontWeight: '600',
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
  addButton: {
    margin: 16,
    backgroundColor: '#FF5722',
  },
});


