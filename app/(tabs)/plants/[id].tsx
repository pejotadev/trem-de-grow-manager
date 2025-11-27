import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getPlant,
  getPlantStages,
  getPlantWaterRecords,
  getEnvironment,
  deletePlant,
  createStage,
  updatePlant,
  getUserEnvironments,
  clonePlants,
} from '../../../firebase/firestore';
import { Plant, Stage, WaterRecord, StageName, Environment } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const STAGES: StageName[] = ['Seedling', 'Veg', 'Flower', 'Drying', 'Curing'];

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

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [envModalVisible, setEnvModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStrain, setEditStrain] = useState('');
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  // Clone state
  const [cloneModalVisible, setCloneModalVisible] = useState(false);
  const [cloneEnvModalVisible, setCloneEnvModalVisible] = useState(false);
  const [cloneCount, setCloneCount] = useState('1');
  const [cloneStage, setCloneStage] = useState<StageName>('Seedling');
  const [cloneEnvironment, setCloneEnvironment] = useState<Environment | null>(null);
  const [cloning, setCloning] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadPlantData = async () => {
    if (!id || typeof id !== 'string') {
      console.log('[PlantDetail] Invalid ID:', id);
      return;
    }

    try {
      console.log('[PlantDetail] Loading plant data for ID:', id);
      
      const plantData = await getPlant(id);
      
      if (!plantData) {
        setLoading(false);
        return;
      }

      // Load environment data
      let envData: Environment | null = null;
      if (plantData.environmentId) {
        envData = await getEnvironment(plantData.environmentId);
      }

      const [stagesData, waterData] = await Promise.all([
        getPlantStages(id),
        getPlantWaterRecords(id),
      ]);

      console.log('[PlantDetail] Plant data loaded:', plantData);
      setPlant(plantData);
      setEnvironment(envData);
      setStages(stagesData);
      setWaterRecords(waterData);
    } catch (error: any) {
      console.error('[PlantDetail] Error loading plant data:', error);
      Alert.alert('Error', 'Failed to load plant data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const loadEnvironments = async () => {
    if (!userData) return;
    try {
      const userEnvs = await getUserEnvironments(userData.uid);
      setEnvironments(userEnvs);
    } catch (error) {
      console.error('[PlantDetail] Error loading environments:', error);
    }
  };

  useEffect(() => {
    loadPlantData();
    loadEnvironments();
  }, [id, userData]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Plant',
      'Are you sure you want to delete this plant? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deletePlant(id);
              Alert.alert('Success', 'Plant deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };

  const handleUpdateStage = (newStage: StageName) => {
    Alert.alert(
      'Update Stage',
      `Change stage to ${newStage}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Update',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              const now = Date.now();
              await createStage({
                plantId: id,
                name: newStage,
                startDate: now,
              });
              await updatePlant(id, { currentStage: newStage });
              loadPlantData();
              Alert.alert('Success', 'Stage updated!');
            } catch (error) {
              Alert.alert('Error', 'Failed to update stage');
            }
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    if (plant) {
      setEditName(plant.name);
      setEditStrain(plant.strain);
      setSelectedEnvironment(environment);
      setEditModalVisible(true);
    }
  };

  const handleEditSave = async () => {
    if (!editName || !editStrain) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!selectedEnvironment) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    if (!id || typeof id !== 'string') return;

    try {
      await updatePlant(id, {
        name: editName,
        strain: editStrain,
        environmentId: selectedEnvironment.id,
      });
      setEditModalVisible(false);
      loadPlantData();
      Alert.alert('Success', 'Plant updated!');
    } catch (error) {
      Alert.alert('Error', 'Failed to update plant');
    }
  };

  const handleClonePress = () => {
    setCloneCount('1');
    setCloneStage('Seedling');
    setCloneEnvironment(environments[0] || null);
    setCloneModalVisible(true);
  };

  const handleCloneSubmit = async () => {
    if (!plant || !userData || !cloneEnvironment) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    const count = parseInt(cloneCount, 10);
    if (isNaN(count) || count < 1 || count > 100) {
      Alert.alert('Error', 'Please enter a valid number of clones (1-100)');
      return;
    }

    setCloning(true);
    try {
      await clonePlants({
        sourcePlant: plant,
        targetEnvironmentId: cloneEnvironment.id,
        numberOfClones: count,
        stage: cloneStage,
        userId: userData.uid,
      });

      setCloneModalVisible(false);
      Alert.alert('Success', `Created ${count} clone(s) successfully!`, [
        { text: 'OK', onPress: () => loadPlantData() },
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to create clones: ' + (error.message || 'Unknown error'));
    } finally {
      setCloning(false);
    }
  };

  if (loading) {
    return <Loading message="Loading plant details..." />;
  }

  if (!plant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Plant not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Plant Info */}
        <Card>
          <View style={styles.plantHeader}>
            <View style={styles.plantHeaderContent}>
              <View style={styles.nameRow}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                </View>
              </View>
              <Text style={styles.plantStrain}>{plant.strain}</Text>
              {plant.currentStage && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{plant.currentStage}</Text>
                </View>
              )}
              <Text style={styles.date}>
                Started: {format(new Date(plant.startDate), 'MMM dd, yyyy')}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <Ionicons name="pencil" size={24} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Environment Info */}
        {environment && (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/environments/${environment.id}`)}>
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
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Update Stage */}
        <Card>
          <Text style={styles.sectionTitle}>Update Stage</Text>
          <View style={styles.stageGrid}>
            <View style={styles.stageRow}>
              {STAGES.slice(0, 3).map((stage) => (
                <TouchableOpacity
                  key={stage}
                  style={[
                    styles.stageButton,
                    plant.currentStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                  ]}
                  onPress={() => handleUpdateStage(stage)}
                >
                  <Text
                    style={[
                      styles.stageButtonText,
                      plant.currentStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                    ]}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.stageRow}>
              {STAGES.slice(3, 5).map((stage) => (
                <TouchableOpacity
                  key={stage}
                  style={[
                    styles.stageButtonWide,
                    plant.currentStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                  ]}
                  onPress={() => handleUpdateStage(stage)}
                >
                  <Text
                    style={[
                      styles.stageButtonText,
                      plant.currentStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                    ]}
                  >
                    {stage}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Card>

        {/* Stage History */}
        <Card>
          <Text style={styles.sectionTitle}>Stage History ({stages.length})</Text>
          {stages.length > 0 ? (
            stages.map((stage) => (
              <View key={stage.id} style={styles.logItem}>
                <View style={styles.logIcon}>
                  <Ionicons name="git-branch-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logTitle}>{stage.name}</Text>
                  <Text style={styles.logDate}>
                    {format(new Date(stage.startDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No stage history</Text>
          )}
        </Card>

        {/* Recent Watering Logs */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Recent Watering ({waterRecords.length})
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/logs/watering')}>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>
          {waterRecords.slice(0, 3).map((record) => (
            <View key={record.id} style={styles.logItem}>
              <View style={styles.logIcon}>
                <Ionicons name="water" size={20} color="#2196F3" />
              </View>
              <View style={styles.logContent}>
                <Text style={styles.logTitle}>
                  {record.ingredients.length} ingredient(s)
                </Text>
                <Text style={styles.logDate}>
                  {format(new Date(record.date), 'MMM dd, yyyy')}
                </Text>
                {record.notes && (
                  <Text style={styles.logNotes}>{record.notes}</Text>
                )}
              </View>
            </View>
          ))}
          {waterRecords.length === 0 && (
            <Text style={styles.emptyText}>No watering logs</Text>
          )}
        </Card>

        <Button title="Clone Plant" onPress={handleClonePress} variant="secondary" />
        <Button title="Delete Plant" onPress={handleDelete} variant="danger" />
      </ScrollView>

      {/* Edit Plant Modal */}
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
            <Text style={styles.modalTitle}>Edit Plant</Text>
            {plant && (
              <View style={styles.controlNumberDisplay}>
                <Text style={styles.controlNumberDisplayLabel}>Control Number</Text>
                <Text style={styles.controlNumberDisplayValue}>{plant.controlNumber}</Text>
                <Text style={styles.controlNumberDisplayHint}>Auto-generated, cannot be changed</Text>
              </View>
            )}
            <ScrollView>
              <Input
                label="Plant Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g., Northern Lights #1"
              />
              <Input
                label="Strain"
                value={editStrain}
                onChangeText={setEditStrain}
                placeholder="e.g., Northern Lights"
              />
              
              <Text style={styles.inputLabel}>Environment</Text>
              <TouchableOpacity
                style={styles.envSelector}
                onPress={() => setEnvModalVisible(true)}
              >
                {selectedEnvironment && (
                  <View style={styles.selectedEnv}>
                    <View
                      style={[
                        styles.envIconTiny,
                        { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                        size={16}
                        color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                      />
                    </View>
                    <Text style={styles.envSelectorName}>{selectedEnvironment.name}</Text>
                  </View>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title="Save Changes" onPress={handleEditSave} />
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Environment Selection Modal */}
      <Modal
        visible={envModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEnvModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Environment</Text>
            <ScrollView>
              {environments.map((env) => (
                <TouchableOpacity
                  key={env.id}
                  style={styles.envOption}
                  onPress={() => {
                    setSelectedEnvironment(env);
                    setEnvModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.envIconTiny,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={16}
                      color={ENVIRONMENT_COLORS[env.type]}
                    />
                  </View>
                  <View style={styles.envOptionText}>
                    <Text style={styles.envOptionName}>{env.name}</Text>
                    <Text style={styles.envOptionType}>{env.type}</Text>
                  </View>
                  {selectedEnvironment?.id === env.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setEnvModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Clone Plant Modal */}
      <Modal
        visible={cloneModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCloneModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Clone Plant</Text>

            {/* Source plant info */}
            <View style={styles.cloneSourceInfo}>
              <Ionicons name="leaf" size={20} color="#4CAF50" />
              <Text style={styles.cloneSourceText}>{plant?.name}</Text>
              <View style={styles.controlBadge}>
                <Text style={styles.controlText}>#{plant?.controlNumber}</Text>
              </View>
            </View>

            <ScrollView>
              <Input
                label="Number of Clones *"
                value={cloneCount}
                onChangeText={setCloneCount}
                placeholder="1"
                keyboardType="number-pad"
              />

              {/* Environment Selection */}
              <Text style={styles.inputLabel}>Target Environment *</Text>
              <TouchableOpacity
                style={styles.envSelector}
                onPress={() => setCloneEnvModalVisible(true)}
              >
                {cloneEnvironment ? (
                  <View style={styles.selectedEnv}>
                    <View
                      style={[
                        styles.envIconTiny,
                        { backgroundColor: ENVIRONMENT_COLORS[cloneEnvironment.type] + '20' },
                      ]}
                    >
                      <Ionicons
                        name={ENVIRONMENT_ICONS[cloneEnvironment.type]}
                        size={16}
                        color={ENVIRONMENT_COLORS[cloneEnvironment.type]}
                      />
                    </View>
                    <Text style={styles.envSelectorName}>{cloneEnvironment.name}</Text>
                  </View>
                ) : (
                  <Text style={styles.envSelectorPlaceholder}>Select environment...</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {/* Stage Selection */}
              <Text style={styles.inputLabel}>Starting Stage *</Text>
              <View style={styles.stageGrid}>
                <View style={styles.stageRow}>
                  {STAGES.slice(0, 3).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stageButton,
                        cloneStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setCloneStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          cloneStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.stageRow}>
                  {STAGES.slice(3, 5).map((stage) => (
                    <TouchableOpacity
                      key={stage}
                      style={[
                        styles.stageButtonWide,
                        cloneStage === stage ? styles.stageButtonActive : styles.stageButtonInactive,
                      ]}
                      onPress={() => setCloneStage(stage)}
                    >
                      <Text
                        style={[
                          styles.stageButtonText,
                          cloneStage === stage ? styles.stageButtonTextActive : styles.stageButtonTextInactive,
                        ]}
                      >
                        {stage}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Clone info hint */}
              <View style={styles.cloneHint}>
                <Ionicons name="information-circle-outline" size={16} color="#666" />
                <Text style={styles.cloneHintText}>
                  Clones will have control numbers starting with "CL" and won't include watering logs.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button
                title={cloning ? 'Creating Clones...' : 'Create Clones'}
                onPress={handleCloneSubmit}
                disabled={cloning}
              />
              <Button
                title="Cancel"
                onPress={() => setCloneModalVisible(false)}
                variant="secondary"
                disabled={cloning}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Clone Environment Selection Modal */}
      <Modal
        visible={cloneEnvModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCloneEnvModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Target Environment</Text>
            <ScrollView>
              {environments.map((env) => (
                <TouchableOpacity
                  key={env.id}
                  style={styles.envOption}
                  onPress={() => {
                    setCloneEnvironment(env);
                    setCloneEnvModalVisible(false);
                  }}
                >
                  <View
                    style={[
                      styles.envIconTiny,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={16}
                      color={ENVIRONMENT_COLORS[env.type]}
                    />
                  </View>
                  <View style={styles.envOptionText}>
                    <Text style={styles.envOptionName}>{env.name}</Text>
                    <Text style={styles.envOptionType}>{env.type}</Text>
                  </View>
                  {cloneEnvironment?.id === env.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setCloneEnvModalVisible(false)}
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
  plantHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  plantStrain: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  editButton: {
    padding: 4,
  },
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
  envIconTiny: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  viewAll: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  stageGrid: {
    gap: 10,
  },
  stageRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stageButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonWide: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonActive: {
    backgroundColor: '#4CAF50',
  },
  stageButtonInactive: {
    backgroundColor: '#2196F3',
  },
  stageButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  stageButtonTextActive: {
    color: '#fff',
  },
  stageButtonTextInactive: {
    color: '#fff',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedEnv: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  envSelectorName: {
    fontSize: 14,
    color: '#333',
  },
  envOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  envOptionText: {
    flex: 1,
  },
  envOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  envOptionType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
  },
  controlNumberDisplay: {
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  controlNumberDisplayLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  controlNumberDisplayValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controlNumberDisplayHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  cloneSourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  cloneSourceText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cloneHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff3e0',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  cloneHintText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
    lineHeight: 18,
  },
  envSelectorPlaceholder: {
    fontSize: 14,
    color: '#999',
    flex: 1,
  },
});
