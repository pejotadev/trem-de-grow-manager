import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  getFriendPlant,
  getFriendPlantStages,
  getFriendPlantWaterRecords,
  getEnvironment,
  getUser,
} from '../../../../firebase/firestore';
import { Plant, Stage, WaterRecord, Environment, User } from '../../../../types';
import { Card } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Loading } from '../../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const STAGE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Seedling: 'leaf-outline',
  Veg: 'leaf',
  Flower: 'flower-outline',
  Drying: 'sunny-outline',
  Curing: 'time-outline',
};

const STAGE_COLORS: Record<string, string> = {
  Seedling: '#8BC34A',
  Veg: '#4CAF50',
  Flower: '#E91E63',
  Drying: '#FF9800',
  Curing: '#9C27B0',
};

const ENVIRONMENT_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  indoor: 'home',
  outdoor: 'sunny',
  greenhouse: 'leaf',
};

const ENVIRONMENT_COLORS: Record<string, string> = {
  indoor: '#9C27B0',
  outdoor: '#FF9800',
  greenhouse: '#4CAF50',
};

interface TimelineItem {
  id: string;
  type: 'stage' | 'watering';
  date: number;
  data: Stage | WaterRecord;
}

export default function FriendPlantTimelineScreen() {
  const { id, friendId } = useLocalSearchParams();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [friend, setFriend] = useState<User | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [stages, setStages] = useState<Stage[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadPlantData = async () => {
    if (!id || typeof id !== 'string' || !friendId || typeof friendId !== 'string' || !userData) {
      console.log('[FriendPlantTimeline] Missing required data, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[FriendPlantTimeline] Loading plant data for ID:', id, 'friendId:', friendId);
      
      // Load all data in parallel
      const [plantData, stagesData, waterData, friendData] = await Promise.all([
        getFriendPlant(id, friendId, userData.uid),
        getFriendPlantStages(id, friendId, userData.uid),
        getFriendPlantWaterRecords(id, friendId, userData.uid),
        getUser(friendId),
      ]);
      
      if (!plantData) {
        setLoading(false);
        return;
      }

      // Load environment data
      let envData: Environment | null = null;
      if (plantData.environmentId) {
        envData = await getEnvironment(plantData.environmentId);
      }

      setPlant(plantData);
      setFriend(friendData);
      setEnvironment(envData);
      setStages(stagesData);
      setWaterRecords(waterData);

      // Build unified timeline
      const timelineItems: TimelineItem[] = [
        ...stagesData.map(stage => ({
          id: `stage-${stage.id}`,
          type: 'stage' as const,
          date: stage.startDate,
          data: stage,
        })),
        ...waterData.map(water => ({
          id: `water-${water.id}`,
          type: 'watering' as const,
          date: water.date,
          data: water,
        })),
      ];

      // Sort by date descending (newest first)
      timelineItems.sort((a, b) => b.date - a.date);
      setTimeline(timelineItems);

      console.log('[FriendPlantTimeline] Data loaded successfully');
    } catch (error: any) {
      console.error('[FriendPlantTimeline] Error loading plant data:', error);
      Alert.alert('Error', error.message || 'Failed to load plant data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadPlantData();
  };

  useFocusEffect(
    useCallback(() => {
      loadPlantData();
    }, [id, friendId, userData])
  );

  const renderTimelineItem = (item: TimelineItem, index: number) => {
    const isFirst = index === 0;
    const isLast = index === timeline.length - 1;

    if (item.type === 'stage') {
      const stage = item.data as Stage;
      const stageColor = STAGE_COLORS[stage.name] || '#4CAF50';
      const stageIcon = STAGE_ICONS[stage.name] || 'leaf';

      return (
        <View key={item.id} style={styles.timelineItem}>
          {/* Timeline connector */}
          <View style={styles.timelineConnector}>
            {!isFirst && <View style={styles.connectorLineTop} />}
            <View style={[styles.timelineDot, { backgroundColor: stageColor }]}>
              <Ionicons name={stageIcon} size={14} color="#fff" />
            </View>
            {!isLast && <View style={styles.connectorLineBottom} />}
          </View>

          {/* Content */}
          <View style={styles.timelineContent}>
            <View style={[styles.stageCard, { borderLeftColor: stageColor }]}>
              <View style={styles.stageHeader}>
                <Text style={[styles.stageName, { color: stageColor }]}>{stage.name}</Text>
                <View style={[styles.stageBadge, { backgroundColor: stageColor }]}>
                  <Text style={styles.stageBadgeText}>Stage</Text>
                </View>
              </View>
              <Text style={styles.timelineDate}>
                {format(new Date(stage.startDate), 'EEEE, MMM dd, yyyy • h:mm a')}
              </Text>
            </View>
          </View>
        </View>
      );
    }

    // Watering record
    const water = item.data as WaterRecord;

    return (
      <View key={item.id} style={styles.timelineItem}>
        {/* Timeline connector */}
        <View style={styles.timelineConnector}>
          {!isFirst && <View style={styles.connectorLineTop} />}
          <View style={[styles.timelineDot, { backgroundColor: '#2196F3' }]}>
            <Ionicons name="water" size={14} color="#fff" />
          </View>
          {!isLast && <View style={styles.connectorLineBottom} />}
        </View>

        {/* Content */}
        <View style={styles.timelineContent}>
          <View style={[styles.wateringCard, { borderLeftColor: '#2196F3' }]}>
            <View style={styles.wateringHeader}>
              <Text style={styles.wateringTitle}>Watering</Text>
              {water.ingredients.length > 0 && (
                <View style={styles.ingredientsBadge}>
                  <Text style={styles.ingredientsBadgeText}>
                    {water.ingredients.length} ingredient{water.ingredients.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.timelineDate}>
              {format(new Date(water.date), 'EEEE, MMM dd, yyyy • h:mm a')}
            </Text>
            {water.ingredients.length > 0 && (
              <View style={styles.ingredientsList}>
                {water.ingredients.map((ingredient, idx) => (
                  <View key={idx} style={styles.ingredientChip}>
                    <Text style={styles.ingredientChipText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            )}
            {water.notes && (
              <Text style={styles.wateringNotes}>{water.notes}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return <Loading message="Loading plant timeline..." />;
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="leaf-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Plant not found</Text>
          <Text style={styles.errorSubtext}>
            This plant may not exist or you don't have access to view it.
          </Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const currentStageColor = plant.currentStage ? STAGE_COLORS[plant.currentStage] : '#4CAF50';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Friend Badge */}
        {friend && (
          <View style={styles.friendBadge}>
            <View style={styles.friendAvatar}>
              <Text style={styles.friendAvatarText}>
                {(friend.displayName || friend.email).charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.friendBadgeText}>
              {friend.displayName || friend.email}'s plant
            </Text>
          </View>
        )}

        {/* Plant Info Card */}
        <Card>
          <View style={styles.plantHeader}>
            <View style={styles.plantIconContainer}>
              <Ionicons name="leaf" size={32} color="#4CAF50" />
            </View>
            <View style={styles.plantHeaderContent}>
              <View style={styles.nameRow}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                </View>
              </View>
              <Text style={styles.plantStrain}>{plant.strain}</Text>
              {plant.currentStage && (
                <View style={[styles.stageBadgeLarge, { backgroundColor: currentStageColor }]}>
                  <Ionicons
                    name={STAGE_ICONS[plant.currentStage] || 'leaf'}
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.stageBadgeLargeText}>{plant.currentStage}</Text>
                </View>
              )}
              <Text style={styles.date}>
                Started: {format(new Date(plant.startDate), 'MMM dd, yyyy')}
              </Text>
            </View>
          </View>

          {/* Genetic Info */}
          {plant.genetics?.geneticLineage && (
            <View style={styles.lineageBox}>
              <Ionicons name="git-merge-outline" size={16} color="#666" />
              <Text style={styles.lineageText}>{plant.genetics.geneticLineage}</Text>
            </View>
          )}
        </Card>

        {/* Environment Info */}
        {environment && (
          <Card>
            <View style={styles.envCard}>
              <View
                style={[
                  styles.envIconSmall,
                  { backgroundColor: ENVIRONMENT_COLORS[environment.type] + '20' },
                ]}
              >
                <Ionicons
                  name={ENVIRONMENT_ICONS[environment.type]}
                  size={24}
                  color={ENVIRONMENT_COLORS[environment.type]}
                />
              </View>
              <View style={styles.envInfo}>
                <Text style={styles.envLabel}>Environment</Text>
                <Text style={styles.envName}>{environment.name}</Text>
                <Text style={styles.envType}>{environment.type}</Text>
              </View>
            </View>
          </Card>
        )}

        {/* Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{stages.length}</Text>
            <Text style={styles.statLabel}>Stages</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="water" size={20} color="#2196F3" />
            </View>
            <Text style={styles.statValue}>{waterRecords.length}</Text>
            <Text style={styles.statLabel}>Waterings</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="calendar-outline" size={20} color="#FF9800" />
            </View>
            <Text style={styles.statValue}>{timeline.length}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
        </View>

        {/* Timeline Section */}
        <View style={styles.timelineSection}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="time-outline" size={20} color="#333" /> Timeline
          </Text>
          
          {timeline.length === 0 ? (
            <Card>
              <View style={styles.emptyTimeline}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTimelineText}>No timeline events yet</Text>
                <Text style={styles.emptyTimelineSubtext}>
                  Stage changes and watering records will appear here.
                </Text>
              </View>
            </Card>
          ) : (
            <View style={styles.timelineContainer}>
              {timeline.map((item, index) => renderTimelineItem(item, index))}
            </View>
          )}
        </View>

        {/* View Only Notice */}
        <View style={styles.viewOnlyNotice}>
          <Ionicons name="eye-outline" size={18} color="#666" />
          <Text style={styles.viewOnlyText}>
            You are viewing this plant in read-only mode
          </Text>
        </View>

        <Button title="Back to Friend Profile" onPress={() => router.back()} variant="secondary" />
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
    padding: 24,
  },
  errorText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
  },
  // Friend badge
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  friendAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  friendAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  friendBadgeText: {
    fontSize: 14,
    color: '#1565C0',
    fontWeight: '500',
  },
  // Plant header
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plantIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  plantHeaderContent: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  plantName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    flexShrink: 1,
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  plantStrain: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  stageBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  stageBadgeLargeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    color: '#999',
  },
  lineageBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  lineageText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
    flex: 1,
  },
  // Environment Card
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  envIconSmall: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  envInfo: {
    flex: 1,
  },
  envLabel: {
    fontSize: 12,
    color: '#999',
  },
  envName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  envType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  // Timeline Section
  timelineSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyTimeline: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTimelineText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyTimelineSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 0,
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
  },
  connectorLineTop: {
    width: 2,
    height: 16,
    backgroundColor: '#e0e0e0',
  },
  connectorLineBottom: {
    flex: 1,
    width: 2,
    backgroundColor: '#e0e0e0',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    paddingLeft: 8,
  },
  // Stage card in timeline
  stageCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stageName: {
    fontSize: 16,
    fontWeight: '600',
  },
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  timelineDate: {
    fontSize: 12,
    color: '#999',
  },
  // Watering card in timeline
  wateringCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  wateringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  wateringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  ingredientsBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ingredientsBadgeText: {
    color: '#1565C0',
    fontSize: 10,
    fontWeight: '600',
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  ingredientChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  ingredientChipText: {
    fontSize: 12,
    color: '#333',
  },
  wateringNotes: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  // View only notice
  viewOnlyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  viewOnlyText: {
    fontSize: 13,
    color: '#666',
  },
});

