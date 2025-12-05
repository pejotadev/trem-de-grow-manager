import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getSeedGeneticsForContext } from '../../../firebase/firestore';
import { SeedGenetic, SeedType, PlantDominance } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { Ionicons } from '@expo/vector-icons';

type FilterType = 'all' | 'feminized' | 'regular' | 'autoflower';

const SEED_TYPE_COLORS: Record<SeedType, string> = {
  regular: '#9E9E9E',
  feminized: '#E91E63',
  autoflower: '#FF9800',
  fast_version: '#03A9F4',
  cbd: '#4CAF50',
  cbg: '#8BC34A',
};

const DOMINANCE_COLORS: Record<PlantDominance, string> = {
  indica: '#7B1FA2',
  sativa: '#FF5722',
  hybrid: '#4CAF50',
  indica_dominant: '#9C27B0',
  sativa_dominant: '#FF7043',
  balanced: '#66BB6A',
};

const DOMINANCE_ICONS: Record<PlantDominance, keyof typeof Ionicons.glyphMap> = {
  indica: 'moon',
  sativa: 'sunny',
  hybrid: 'git-merge',
  indica_dominant: 'moon-outline',
  sativa_dominant: 'sunny-outline',
  balanced: 'git-merge-outline',
};

export default function GeneticsScreen() {
  const { t } = useTranslation(['genetics', 'common']);
  const [genetics, setGenetics] = useState<SeedGenetic[]>([]);
  const [filteredGenetics, setFilteredGenetics] = useState<SeedGenetic[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const { userData, currentAssociation } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData) {
      setLoading(false);
      return;
    }

    try {
      const geneticsData = await getSeedGeneticsForContext(userData.uid, currentAssociation?.id);
      setGenetics(geneticsData);
      applyFilters(geneticsData, searchQuery, activeFilter);
    } catch (error: any) {
      console.error('[GeneticsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = (data: SeedGenetic[], query: string, filter: FilterType) => {
    let result = data;

    // Apply type filter
    if (filter !== 'all') {
      result = result.filter(g => g.seedType === filter);
    }

    // Apply search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(g =>
        g.name.toLowerCase().includes(lowerQuery) ||
        (g.breeder && g.breeder.toLowerCase().includes(lowerQuery)) ||
        (g.lineage && g.lineage.toLowerCase().includes(lowerQuery))
      );
    }

    setFilteredGenetics(result);
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

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(genetics, query, activeFilter);
  };

  const handleFilterChange = (filter: FilterType) => {
    setActiveFilter(filter);
    applyFilters(genetics, searchQuery, filter);
  };

  const getFilterCount = (filter: FilterType): number => {
    if (filter === 'all') return genetics.length;
    return genetics.filter(g => g.seedType === filter).length;
  };

  const renderGenetic = ({ item }: { item: SeedGenetic }) => {
    const seedTypeColor = item.seedType ? SEED_TYPE_COLORS[item.seedType] : '#9E9E9E';
    const dominanceColor = item.dominance ? DOMINANCE_COLORS[item.dominance] : '#9E9E9E';
    const dominanceIcon = item.dominance ? DOMINANCE_ICONS[item.dominance] : 'leaf';

    return (
      <TouchableOpacity onPress={() => router.push(`/(tabs)/genetics/${item.id}`)}>
        <Card style={styles.geneticCard}>
          <View style={styles.geneticHeader}>
            <View style={[styles.iconContainer, { backgroundColor: seedTypeColor + '20' }]}>
              <Ionicons name="leaf" size={24} color={seedTypeColor} />
            </View>
            <View style={styles.geneticInfo}>
              <Text style={styles.geneticName}>{item.name}</Text>
              {item.breeder && (
                <Text style={styles.breederName}>
                  <Ionicons name="person-outline" size={12} color="#666" /> {item.breeder}
                </Text>
              )}
            </View>
            {item.seedType && (
              <View style={[styles.typeBadge, { backgroundColor: seedTypeColor }]}>
                <Text style={styles.typeText}>{t(`seedTypes.${item.seedType}`)}</Text>
              </View>
            )}
          </View>

          <View style={styles.geneticDetails}>
            {item.dominance && (
              <View style={styles.detailRow}>
                <Ionicons name={dominanceIcon} size={16} color={dominanceColor} />
                <Text style={[styles.detailText, { color: dominanceColor }]}>
                  {t(`dominance.${item.dominance}`)}
                </Text>
              </View>
            )}

            {item.geneticGeneration && (
              <View style={styles.detailRow}>
                <Ionicons name="git-branch-outline" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {t(`generations.${item.geneticGeneration}`)}
                </Text>
              </View>
            )}

            {item.lineage && (
              <View style={styles.detailRow}>
                <Ionicons name="git-network-outline" size={16} color="#666" />
                <Text style={styles.detailText} numberOfLines={1}>
                  {item.lineage}
                </Text>
              </View>
            )}

            {item.floweringTime && (
              <View style={styles.detailRow}>
                <Ionicons name="time-outline" size={16} color="#666" />
                <Text style={styles.detailText}>{item.floweringTime}</Text>
              </View>
            )}

            {(item.expectedThcPercent || item.expectedCbdPercent) && (
              <View style={styles.cannabinoidRow}>
                {item.expectedThcPercent && (
                  <View style={styles.cannabinoidBadge}>
                    <Text style={styles.cannabinoidText}>
                      THC {item.expectedThcPercent}%
                    </Text>
                  </View>
                )}
                {item.expectedCbdPercent && (
                  <View style={[styles.cannabinoidBadge, styles.cbdBadge]}>
                    <Text style={styles.cannabinoidText}>
                      CBD {item.expectedCbdPercent}%
                    </Text>
                  </View>
                )}
              </View>
            )}

            {item.terpenes && item.terpenes.length > 0 && (
              <View style={styles.terpeneRow}>
                <Ionicons name="flask-outline" size={14} color="#8BC34A" />
                <Text style={styles.terpeneText} numberOfLines={1}>
                  {item.terpenes.slice(0, 3).map(terp => t(`terpenes.${terp}`)).join(', ')}
                  {item.terpenes.length > 3 ? ` +${item.terpenes.length - 3}` : ''}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <Loading message={t('common:loading')} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder={t('searchPlaceholder')}
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'feminized', 'autoflower', 'regular'] as FilterType[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[
              styles.filterTab,
              activeFilter === filter && styles.filterTabActive,
            ]}
            onPress={() => handleFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === filter && styles.filterTabTextActive,
              ]}
            >
              {t(`filters.${filter}`)} ({getFilterCount(filter)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {filteredGenetics.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="leaf-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>
              {genetics.length === 0 ? t('noGenetics') : t('noResults')}
            </Text>
            <Text style={styles.emptySubtext}>
              {genetics.length === 0 ? t('createFirst') : t('tryAdjusting')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredGenetics}
            keyExtractor={(item) => item.id}
            renderItem={renderGenetic}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
            }
            contentContainerStyle={styles.list}
          />
        )}
      </View>

      {/* Add Genetic Button */}
      <Button
        title={t('addGenetic')}
        onPress={() => router.push('/(tabs)/genetics/new')}
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
  searchContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
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
    paddingVertical: 12,
    alignItems: 'center',
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#8BC34A',
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  filterTabTextActive: {
    color: '#8BC34A',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  geneticCard: {
    marginBottom: 4,
  },
  geneticHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  geneticInfo: {
    flex: 1,
  },
  geneticName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  breederName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  geneticDetails: {
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
    flex: 1,
  },
  cannabinoidRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cannabinoidBadge: {
    backgroundColor: '#FF5722',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cbdBadge: {
    backgroundColor: '#4CAF50',
  },
  cannabinoidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  cardFooter: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
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
    backgroundColor: '#8BC34A',
  },
  terpeneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  terpeneText: {
    fontSize: 12,
    color: '#8BC34A',
    flex: 1,
  },
});

