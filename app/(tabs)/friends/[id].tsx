import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getUser,
  getFriendPublicEnvironments,
  getFriendEnvironmentPlants,
} from '../../../firebase/firestore';
import { User, Environment, Plant } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

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

export default function FriendProfileScreen() {
  const { id } = useLocalSearchParams();
  const [friend, setFriend] = useState<User | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPlants, setLoadingPlants] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadFriendData = async () => {
    if (!id || typeof id !== 'string' || !userData) {
      setLoading(false);
      return;
    }

    try {
      const [friendData, envData] = await Promise.all([
        getUser(id),
        getFriendPublicEnvironments(id, userData.uid),
      ]);

      setFriend(friendData);
      setEnvironments(envData);

      if (envData.length > 0) {
        setSelectedEnvironment(envData[0]);
      }
    } catch (error: any) {
      console.error('[FriendProfile] Error loading data:', error);
      Alert.alert('Error', error.message || 'Failed to load friend data');
    } finally {
      setLoading(false);
    }
  };

  const loadPlants = async () => {
    if (!selectedEnvironment || !userData || !id || typeof id !== 'string') return;

    setLoadingPlants(true);
    try {
      const plantsData = await getFriendEnvironmentPlants(
        selectedEnvironment.id,
        id,
        userData.uid
      );
      setPlants(plantsData);
    } catch (error: any) {
      console.error('[FriendProfile] Error loading plants:', error);
      setPlants([]);
    } finally {
      setLoadingPlants(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadFriendData();
    }, [id, userData])
  );

  useEffect(() => {
    if (selectedEnvironment) {
      loadPlants();
    }
  }, [selectedEnvironment]);

  if (loading) {
    return <Loading message="Loading friend profile..." />;
  }

  if (!friend) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>User not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Friend Header */}
        <Card>
          <View style={styles.profileHeader}>
            <View style={styles.largeAvatar}>
              <Text style={styles.largeAvatarText}>
                {(friend.displayName || friend.email).charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {friend.displayName || friend.email}
              </Text>
              {friend.displayName && (
                <Text style={styles.profileEmail}>{friend.email}</Text>
              )}
              <Text style={styles.memberSince}>
                Member since {format(new Date(friend.createdAt), 'MMMM yyyy')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Public Environments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Public Environments ({environments.length})
          </Text>

          {environments.length === 0 ? (
            <Card>
              <View style={styles.noEnvironments}>
                <Ionicons name="lock-closed-outline" size={40} color="#ccc" />
                <Text style={styles.noEnvText}>No public environments</Text>
                <Text style={styles.noEnvSubtext}>
                  This friend hasn't made any environments public yet.
                </Text>
              </View>
            </Card>
          ) : (
            <>
              {/* Environment Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.envScroller}
              >
                {environments.map((env) => (
                  <TouchableOpacity
                    key={env.id}
                    style={[
                      styles.envChip,
                      selectedEnvironment?.id === env.id && styles.envChipActive,
                      { borderColor: ENVIRONMENT_COLORS[env.type] },
                    ]}
                    onPress={() => setSelectedEnvironment(env)}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={16}
                      color={
                        selectedEnvironment?.id === env.id
                          ? '#fff'
                          : ENVIRONMENT_COLORS[env.type]
                      }
                    />
                    <Text
                      style={[
                        styles.envChipText,
                        selectedEnvironment?.id === env.id && styles.envChipTextActive,
                      ]}
                    >
                      {env.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Selected Environment Details */}
              {selectedEnvironment && (
                <Card>
                  <View style={styles.envDetails}>
                    <View style={styles.envHeader}>
                      <View
                        style={[
                          styles.envIcon,
                          { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                        ]}
                      >
                        <Ionicons
                          name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                          size={28}
                          color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                        />
                      </View>
                      <View style={styles.envInfo}>
                        <Text style={styles.envName}>{selectedEnvironment.name}</Text>
                        <View style={[styles.typeBadge, { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] }]}>
                          <Text style={styles.typeBadgeText}>{selectedEnvironment.type}</Text>
                        </View>
                      </View>
                    </View>

                    {selectedEnvironment.dimensions && (
                      <View style={styles.envDimensions}>
                        <Ionicons name="resize-outline" size={16} color="#666" />
                        <Text style={styles.dimensionsText}>
                          {selectedEnvironment.dimensions.width} × {selectedEnvironment.dimensions.length} × {selectedEnvironment.dimensions.height} {selectedEnvironment.dimensions.unit}
                        </Text>
                      </View>
                    )}

                    {selectedEnvironment.lightSetup && (
                      <View style={styles.envDetail}>
                        <Ionicons name="sunny-outline" size={16} color="#FFC107" />
                        <Text style={styles.detailText}>{selectedEnvironment.lightSetup}</Text>
                      </View>
                    )}

                    {selectedEnvironment.notes && (
                      <Text style={styles.envNotes}>{selectedEnvironment.notes}</Text>
                    )}
                  </View>
                </Card>
              )}

              {/* Plants in Environment */}
              <View style={styles.plantsSection}>
                <Text style={styles.plantsSectionTitle}>
                  Plants ({plants.length})
                </Text>

                {loadingPlants ? (
                  <Loading message="Loading plants..." />
                ) : plants.length === 0 ? (
                  <Card>
                    <View style={styles.noPlantsContainer}>
                      <Ionicons name="leaf-outline" size={32} color="#ccc" />
                      <Text style={styles.noPlantsText}>No plants in this environment</Text>
                    </View>
                  </Card>
                ) : (
                  plants.map((plant) => (
                    <Card key={plant.id}>
                      <View style={styles.plantCard}>
                        <View style={styles.plantIcon}>
                          <Ionicons name="leaf" size={24} color="#4CAF50" />
                        </View>
                        <View style={styles.plantInfo}>
                          <View style={styles.plantHeader}>
                            <Text style={styles.plantName}>{plant.name}</Text>
                            <View style={styles.controlBadge}>
                              <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                            </View>
                          </View>
                          <Text style={styles.plantStrain}>{plant.strain}</Text>
                          {plant.currentStage && (
                            <View style={styles.stageBadge}>
                              <Text style={styles.stageBadgeText}>{plant.currentStage}</Text>
                            </View>
                          )}
                          <Text style={styles.plantDate}>
                            Started: {format(new Date(plant.startDate), 'MMM dd, yyyy')}
                          </Text>
                        </View>
                      </View>
                    </Card>
                  ))
                )}
              </View>
            </>
          )}
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    marginBottom: 24,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  largeAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  memberSince: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  noEnvironments: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  noEnvText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  noEnvSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  envScroller: {
    paddingBottom: 12,
    gap: 8,
  },
  envChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#fff',
    gap: 6,
  },
  envChipActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  envChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  envChipTextActive: {
    color: '#fff',
  },
  envDetails: {
    gap: 12,
  },
  envHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  envIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  envInfo: {
    flex: 1,
  },
  envName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  envDimensions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dimensionsText: {
    fontSize: 13,
    color: '#666',
  },
  envDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: '#666',
  },
  envNotes: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  plantsSection: {
    marginTop: 16,
  },
  plantsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  noPlantsContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  noPlantsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  plantCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plantIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4CAF5020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plantInfo: {
    flex: 1,
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  plantStrain: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
  },
  stageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  plantDate: {
    fontSize: 11,
    color: '#999',
  },
});

