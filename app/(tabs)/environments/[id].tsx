import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getEnvironment,
  getEnvironmentPlants,
  getEnvironmentRecords,
  deleteEnvironment,
  updateEnvironment,
} from '../../../firebase/firestore';
import { Environment, Plant, EnvironmentRecord, EnvironmentType } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
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

export default function EnvironmentDetailScreen() {
  const { t } = useTranslation(['environments', 'common', 'plants']);
  const { id } = useLocalSearchParams();
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [envRecords, setEnvRecords] = useState<EnvironmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLightSetup, setEditLightSetup] = useState('');
  const [editVentilation, setEditVentilation] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadEnvironmentData = async () => {
    if (!id || typeof id !== 'string') {
      console.log('[EnvironmentDetail] Invalid ID:', id);
      setLoading(false);
      return;
    }

    try {
      console.log('[EnvironmentDetail] Loading environment data for ID:', id);
      console.log('[EnvironmentDetail] Current user UID:', userData?.uid);
      
      // Load environment first
      const envData = await getEnvironment(id);
      console.log('[EnvironmentDetail] Environment data loaded:', envData);
      console.log('[EnvironmentDetail] Environment userId:', envData?.userId, '| Current user:', userData?.uid);
      
      // Verify the environment belongs to the current user
      if (envData && userData && envData.userId !== userData.uid) {
        console.warn('[EnvironmentDetail] Environment does not belong to current user');
        Alert.alert(
          t('common:error'),
          t('environments:detail.accessDenied'),
          [{ text: t('common:ok'), onPress: () => router.back() }]
        );
        setLoading(false);
        return;
      }
      
      setEnvironment(envData);
      
      // Load plants and records separately to handle errors gracefully
      try {
        if (envData && envData.userId) {
          const plantsData = await getEnvironmentPlants(id, envData.userId);
          setPlants(plantsData);
        }
      } catch (err) {
        console.log('[EnvironmentDetail] Error loading plants:', err);
        setPlants([]);
      }
      
      try {
        const recordsData = await getEnvironmentRecords(id);
        setEnvRecords(recordsData);
      } catch (err) {
        console.log('[EnvironmentDetail] Error loading records:', err);
        setEnvRecords([]);
      }
    } catch (error: any) {
      console.error('[EnvironmentDetail] Error loading environment data:', error);
      Alert.alert(t('common:error'), t('environments:detail.failedToLoad'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadEnvironmentData();
  };

  // Reload data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (id) {
        loadEnvironmentData();
      }
    }, [id])
  );

  const handleDelete = () => {
    Alert.alert(
      t('environments:detail.deleteEnvironment'),
      t('environments:detail.deleteConfirm'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('common:delete'),
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deleteEnvironment(id);
              Alert.alert(t('common:success'), t('environments:detail.deleted'), [
                { text: t('common:ok'), onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert(t('common:error'), t('environments:detail.failedToDelete'));
            }
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    if (environment) {
      setEditName(environment.name);
      setEditLightSetup(environment.lightSetup || '');
      setEditVentilation(environment.ventilation || '');
      setEditNotes(environment.notes || '');
      setEditIsPublic(environment.isPublic || false);
      setEditModalVisible(true);
    }
  };

  const handleEditSave = async () => {
    if (!editName) {
      Alert.alert(t('common:error'), t('environments:errors.nameRequired'));
      return;
    }

    if (!id || typeof id !== 'string') return;

    try {
      // Build update data - only include non-empty values
      // Firestore doesn't accept undefined values
      const updateData: Partial<Environment> = {
        name: editName,
        isPublic: editIsPublic,
      };
      
      // Only include optional fields if they have values
      if (editLightSetup.trim()) {
        updateData.lightSetup = editLightSetup;
      }
      if (editVentilation.trim()) {
        updateData.ventilation = editVentilation;
      }
      if (editNotes.trim()) {
        updateData.notes = editNotes;
      }
      
      console.log('[EnvironmentDetail] Updating environment:', id);
      console.log('[EnvironmentDetail] Update data:', updateData);
      
      await updateEnvironment(id, updateData);
      setEditModalVisible(false);
      loadEnvironmentData();
      Alert.alert(t('common:success'), t('environments:detail.updated'));
    } catch (error: any) {
      console.error('[EnvironmentDetail] Update error:', error);
      Alert.alert(t('common:error'), t('environments:detail.failedToUpdate'));
    }
  };

  if (loading) {
    return <Loading message={t('environments:loadingDetails')} />;
  }

  if (!environment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('environments:environmentNotFound')}</Text>
          <Button title={t('common:goBack')} onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const envColor = ENVIRONMENT_COLORS[environment.type];
  const envIcon = ENVIRONMENT_ICONS[environment.type];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Environment Info */}
        <Card>
          <View style={styles.envHeader}>
            <View style={[styles.iconContainer, { backgroundColor: envColor + '20' }]}>
              <Ionicons name={envIcon} size={40} color={envColor} />
            </View>
            <View style={styles.envHeaderContent}>
              <Text style={styles.envName}>{environment.name}</Text>
              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: envColor }]}>
                  <Text style={styles.badgeText}>{t(`common:environmentTypes.${environment.type}`)}</Text>
                </View>
                {environment.isPublic && (
                  <View style={styles.publicBadge}>
                    <Ionicons name="globe" size={12} color="#fff" />
                    <Text style={styles.publicBadgeText}>{t('environments:detail.public')}</Text>
                  </View>
                )}
              </View>
              {environment.dimensions && (
                <Text style={styles.dimensions}>
                  {environment.dimensions.width} × {environment.dimensions.length} × {environment.dimensions.height} {environment.dimensions.unit}
                </Text>
              )}
              <Text style={styles.date}>
                {t('common:dates.created')}: {format(new Date(environment.createdAt), 'MMM dd, yyyy')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <Ionicons name="pencil" size={24} color={envColor} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Equipment Info */}
        {(environment.lightSetup || environment.ventilation) && (
          <Card>
            <Text style={styles.sectionTitle}>{t('plants:detail.equipment')}</Text>
            {environment.lightSetup && (
              <View style={styles.equipmentItem}>
                <Ionicons name="sunny" size={20} color="#FFC107" />
                <View style={styles.equipmentText}>
                  <Text style={styles.equipmentLabel}>{t('plants:detail.lightSetup')}</Text>
                  <Text style={styles.equipmentValue}>{environment.lightSetup}</Text>
                </View>
              </View>
            )}
            {environment.ventilation && (
              <View style={styles.equipmentItem}>
                <Ionicons name="aperture" size={20} color="#2196F3" />
                <View style={styles.equipmentText}>
                  <Text style={styles.equipmentLabel}>{t('plants:detail.ventilation')}</Text>
                  <Text style={styles.equipmentValue}>{environment.ventilation}</Text>
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Notes */}
        {environment.notes && (
          <Card>
            <Text style={styles.sectionTitle}>{t('common:notes')}</Text>
            <Text style={styles.notesText}>{environment.notes}</Text>
          </Card>
        )}

        {/* Plants in this Environment */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('environments:detail.plants')} ({plants.length})</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/plants/new')}>
              <Text style={styles.addLink}>{t('plants:detail.addPlant')}</Text>
            </TouchableOpacity>
          </View>
          {plants.length > 0 ? (
            plants.map((plant) => (
              <TouchableOpacity
                key={plant.id}
                style={styles.plantItem}
                onPress={() => router.push(`/(tabs)/plants/${plant.id}`)}
              >
                <View style={styles.plantIcon}>
                  <Ionicons name="leaf" size={20} color="#4CAF50" />
                </View>
                <View style={styles.plantContent}>
                  <View style={styles.plantHeader}>
                    <Text style={styles.plantName}>{plant.name}</Text>
                    <View style={styles.controlBadge}>
                      <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                    </View>
                  </View>
                  <Text style={styles.plantStrain}>{plant.strain}</Text>
                  {plant.currentStage && (
                    <View style={styles.stageBadge}>
                      <Text style={styles.stageBadgeText}>{t(`common:stages.${plant.currentStage.toLowerCase()}`)}</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>{t('plants:detail.noPlantsInEnvironment')}</Text>
          )}
        </Card>

        {/* Recent Environment Logs */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {t('plants:detail.recentEnvironmentLogs')} ({envRecords.length})
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/logs/environment')}>
              <Text style={styles.viewAll}>{t('common:viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {envRecords.slice(0, 3).map((record) => (
            <View key={record.id} style={styles.logItem}>
              <View style={styles.logIcon}>
                <Ionicons name="thermometer" size={20} color="#FF9800" />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logTitle}>
                  {record.temp}°C | {record.humidity}% | {record.lightHours}h light
                </Text>
                <Text style={styles.logDate}>
                  {format(new Date(record.date), 'MMM dd, yyyy - HH:mm')}
                </Text>
                {record.notes && (
                  <Text style={styles.logNotes}>{record.notes}</Text>
                )}
              </View>
            </View>
          ))}
          {envRecords.length === 0 && (
            <Text style={styles.emptyText}>{t('environments:detail.noEnvironmentLogs')}</Text>
          )}
        </Card>

        <Button title={t('environments:detail.deleteEnvironment')} onPress={handleDelete} variant="danger" />
      </ScrollView>

      {/* Edit Environment Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('environments:detail.editEnvironment')}</Text>
            <ScrollView>
              <Input
                label={t('environments:form.nameLabel')}
                value={editName}
                onChangeText={setEditName}
                placeholder={t('environments:form.namePlaceholder')}
              />
              <Input
                label={t('environments:form.lightSetupLabel')}
                value={editLightSetup}
                onChangeText={setEditLightSetup}
                placeholder={t('environments:form.lightSetupPlaceholder')}
              />
              <Input
                label={t('environments:form.ventilationLabel')}
                value={editVentilation}
                onChangeText={setEditVentilation}
                placeholder={t('environments:form.ventilationPlaceholder')}
              />
              <Input
                label={t('common:notes')}
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder={t('common:notesPlaceholder')}
                multiline
                numberOfLines={3}
              />

              {/* Public Environment Toggle */}
              <View style={styles.publicSection}>
                <View style={styles.publicHeader}>
                  <View style={styles.publicLabelContainer}>
                    <Ionicons name="globe-outline" size={20} color="#4CAF50" />
                    <Text style={styles.publicLabel}>{t('environments:form.publicEnvironment')}</Text>
                  </View>
                  <Switch
                    value={editIsPublic}
                    onValueChange={setEditIsPublic}
                    trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                    thumbColor={editIsPublic ? '#4CAF50' : '#f4f3f4'}
                  />
                </View>
                <Text style={styles.publicDescription}>
                  {editIsPublic
                    ? t('environments:form.publicDescription')
                    : t('environments:form.privateDescription')}
                </Text>
              </View>
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title={t('common:saveChanges')} onPress={handleEditSave} />
              <Button
                title={t('common:cancel')}
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    marginBottom: 16,
  },
  envHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  envHeaderContent: {
    flex: 1,
  },
  envName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  publicBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2196F3',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  publicBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  dimensions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  editButton: {
    padding: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addLink: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  viewAll: {
    color: '#2E7D32',
    fontWeight: '600',
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  equipmentText: {
    marginLeft: 12,
    flex: 1,
  },
  equipmentLabel: {
    fontSize: 12,
    color: '#999',
  },
  equipmentValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  plantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  plantIcon: {
    marginRight: 12,
  },
  plantContent: {
    flex: 1,
  },
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
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
    marginBottom: 4,
  },
  stageBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  stageBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  logContent: {
    flex: 1,
  },
  logTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logNotes: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 12,
  },
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
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    marginTop: 8,
  },
  publicSection: {
    marginTop: 16,
    backgroundColor: '#e8f5e9',
    padding: 16,
    borderRadius: 12,
  },
  publicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  publicLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  publicLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  publicDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
  },
});
