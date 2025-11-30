import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getUserPlants, getUserEnvironments } from '../../firebase/firestore';
import { Plant, Environment } from '../../types';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Loading } from '../../components/Loading';
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

interface PlantSection {
  title: string;
  environmentId: string;
  environmentType: string;
  data: Plant[];
}

export default function HomeScreen() {
  const { t } = useTranslation(['plants', 'common', 'environments', 'auth']);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [sections, setSections] = useState<PlantSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData, logout } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData || !userData.uid) {
      console.log('[HomeScreen] No userData or userData.uid, skipping load');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[HomeScreen] Loading data for user:', userData.uid);
      const [userPlants, userEnvironments] = await Promise.all([
        getUserPlants(userData.uid),
        getUserEnvironments(userData.uid),
      ]);
      
      console.log('[HomeScreen] Loaded plants:', userPlants.length);
      console.log('[HomeScreen] Loaded environments:', userEnvironments.length);
      
      setPlants(userPlants);
      setEnvironments(userEnvironments);
      
      // Group plants by environment
      const envMap = new Map(userEnvironments.map(e => [e.id, e]));
      const grouped: { [key: string]: Plant[] } = {};
      
      userPlants.forEach(plant => {
        const envId = plant.environmentId || 'unassigned';
        if (!grouped[envId]) {
          grouped[envId] = [];
        }
        grouped[envId].push(plant);
      });
      
      // Create sections
      const newSections: PlantSection[] = [];
      
      userEnvironments.forEach(env => {
        if (grouped[env.id]) {
          newSections.push({
            title: env.name,
            environmentId: env.id,
            environmentType: env.type,
            data: grouped[env.id],
          });
        }
      });
      
      // Add unassigned plants if any
      if (grouped['unassigned']) {
        newSections.push({
          title: t('plants:unassigned'),
          environmentId: 'unassigned',
          environmentType: 'indoor',
          data: grouped['unassigned'],
        });
      }
      
      setSections(newSections);
    } catch (error: any) {
      console.error('[HomeScreen] Error loading data:', error);
      Alert.alert(t('common:error'), error.message || 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload data when screen comes into focus (e.g., after creating a plant)
  useFocusEffect(
    useCallback(() => {
      if (userData) {
        loadData();
      }
    }, [userData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    Alert.alert(t('auth:logout.title'), t('auth:logout.confirmMessage'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('auth:logout.button'),
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (loading) {
    return <Loading message={t('plants:loadingPlants')} />;
  }

  const renderPlant = ({ item }: { item: Plant }) => (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/plants/${item.id}`)}>
      <Card>
        <View style={styles.plantCard}>
          <View style={styles.plantInfo}>
            <View style={styles.plantHeader}>
              <Text style={styles.plantName}>{item.name}</Text>
              <View style={styles.controlBadge}>
                <Text style={styles.controlText}>#{item.controlNumber}</Text>
              </View>
            </View>
            <Text style={styles.plantStrain}>{item.strain}</Text>
            {item.currentStage && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t(`common:stages.${item.currentStage}`)}</Text>
              </View>
            )}
            <Text style={styles.plantDate}>
              {t('common:dates.started')}: {format(new Date(item.startDate), 'MMM dd, yyyy')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: PlantSection }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => {
        if (section.environmentId !== 'unassigned') {
          router.push(`/(tabs)/environments/${section.environmentId}`);
        }
      }}
    >
      <View style={styles.sectionHeaderContent}>
        <View
          style={[
            styles.sectionIcon,
            { backgroundColor: ENVIRONMENT_COLORS[section.environmentType] + '20' },
          ]}
        >
          <Ionicons
            name={ENVIRONMENT_ICONS[section.environmentType]}
            size={18}
            color={ENVIRONMENT_COLORS[section.environmentType]}
          />
        </View>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <View style={styles.plantCountChip}>
          <Text style={styles.plantCountText}>{section.data.length}</Text>
        </View>
      </View>
      {section.environmentId !== 'unassigned' && (
        <Ionicons name="chevron-forward" size={18} color="#999" />
      )}
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color="#ccc" />
      <Text style={styles.emptyText}>{t('plants:noPlants')}</Text>
      <Text style={styles.emptySubtext}>
        {environments.length === 0 
          ? t('plants:createEnvironmentFirst')
          : t('plants:startFirstGrow')}
      </Text>
      {environments.length === 0 && (
        <Button
          title={t('plants:createEnvironment')}
          onPress={() => router.push('/(tabs)/environments/new')}
          style={styles.emptyButton}
        />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t('plants:hello')}</Text>
          <Text style={styles.email}>{userData?.email}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="leaf" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{plants.length}</Text>
            <Text style={styles.statLabel}>{t('common:tabs.plants')}</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="cube" size={24} color="#2E7D32" />
            <Text style={styles.statNumber}>{environments.length}</Text>
            <Text style={styles.statLabel}>{t('common:tabs.environments')}</Text>
          </View>
        </View>

        {plants.length === 0 ? (
          renderEmptyState()
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderPlant}
            renderSectionHeader={renderSectionHeader}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.list}
            stickySectionHeadersEnabled={false}
          />
        )}

        <Button
          title={t('plants:addPlant')}
          onPress={() => router.push('/(tabs)/plants/new')}
          variant="primary"
          style={styles.addButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  list: {
    paddingBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  plantCountChip: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  plantCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  plantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  plantStrain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  plantDate: {
    fontSize: 12,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 20,
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
  emptyButton: {
    marginTop: 24,
  },
  addButton: {
    marginTop: 8,
  },
});
