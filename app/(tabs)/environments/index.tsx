import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import { getEnvironmentsForContext, getEnvironmentPlants } from '../../../firebase/firestore';
import { Environment, Plant } from '../../../types';
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

interface EnvironmentWithPlantCount extends Environment {
  plantCount: number;
  isPublic: boolean;
}

export default function EnvironmentsScreen() {
  const { t } = useTranslation(['environments', 'common', 'plants']);
  const [environments, setEnvironments] = useState<EnvironmentWithPlantCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { userData, currentAssociation } = useAuth();
  const router = useRouter();

  const loadEnvironments = async () => {
    if (!userData) {
      console.log('[EnvironmentsScreen] No userData, skipping load');
      setLoading(false);
      return;
    }
    
    try {
      console.log('[EnvironmentsScreen] Loading environments for user:', userData.uid, 'association:', currentAssociation?.id);
      const userEnvironments = await getEnvironmentsForContext(userData.uid, currentAssociation?.id);
      console.log('[EnvironmentsScreen] Got environments:', userEnvironments.length);
      
      // Get plant counts for each environment (with error handling per environment)
      const environmentsWithCounts = await Promise.all(
        userEnvironments.map(async (env) => {
          try {
            const plants = await getEnvironmentPlants(env.id, userData.uid);
            return { ...env, plantCount: plants.length };
          } catch (err) {
            console.log('[EnvironmentsScreen] Error getting plants for env:', env.id, err);
            return { ...env, plantCount: 0 };
          }
        })
      );
      
      console.log('[EnvironmentsScreen] Loaded environments with counts:', environmentsWithCounts.length);
      setEnvironments(environmentsWithCounts);
    } catch (error: any) {
      console.error('[EnvironmentsScreen] Error loading environments:', error);
      Alert.alert(t('common:error'), t('environments:errors.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload environments when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (userData) {
        loadEnvironments();
      }
    }, [userData, currentAssociation])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadEnvironments();
  };

  const renderEnvironment = ({ item }: { item: EnvironmentWithPlantCount }) => (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/environments/${item.id}`)}>
      <Card>
        <View style={styles.envCard}>
          <View style={[styles.iconContainer, { backgroundColor: ENVIRONMENT_COLORS[item.type] + '20' }]}>
            <Ionicons
              name={ENVIRONMENT_ICONS[item.type]}
              size={32}
              color={ENVIRONMENT_COLORS[item.type]}
            />
          </View>
          <View style={styles.envInfo}>
            <Text style={styles.envName}>{item.name}</Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: ENVIRONMENT_COLORS[item.type] }]}>
                <Text style={styles.badgeText}>{t(`common:environmentTypes.${item.type}`)}</Text>
              </View>
              {item.isPublic && (
                <View style={styles.publicBadge}>
                  <Ionicons name="globe" size={12} color="#fff" />
                </View>
              )}
              <View style={styles.plantCountBadge}>
                <Ionicons name="leaf" size={14} color="#4CAF50" />
                <Text style={styles.plantCountText}>
                  {item.plantCount} {item.plantCount === 1 ? t('plants:plant') : t('plants:plants')}
                </Text>
              </View>
            </View>
            {item.dimensions && (
              <Text style={styles.dimensions}>
                {item.dimensions.width} × {item.dimensions.length} × {item.dimensions.height} {item.dimensions.unit}
              </Text>
            )}
            <Text style={styles.envDate}>
              {t('common:dates.created')}: {format(new Date(item.createdAt), 'MMM dd, yyyy')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#999" />
        </View>
      </Card>
    </TouchableOpacity>
  );

  console.log('[EnvironmentsScreen] Rendering with', environments.length, 'environments');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {loading ? (
          <Loading message={t('environments:loading')} />
        ) : environments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{t('environments:noEnvironments')}</Text>
            <Text style={styles.emptySubtext}>{t('environments:createFirst')}</Text>
          </View>
        ) : (
          <FlatList
            data={environments}
            keyExtractor={(item) => item.id}
            renderItem={renderEnvironment}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            contentContainerStyle={styles.list}
          />
        )}

        <Button
          title={t('environments:addEnvironment')}
          onPress={() => router.push('/(tabs)/environments/new')}
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
  content: {
    flex: 1,
    padding: 16,
  },
  list: {
    paddingBottom: 16,
  },
  envCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
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
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  publicBadge: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 12,
  },
  plantCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plantCountText: {
    fontSize: 12,
    color: '#666',
  },
  dimensions: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  envDate: {
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
  },
  addButton: {
    marginTop: 8,
    backgroundColor: '#2E7D32',
  },
});
