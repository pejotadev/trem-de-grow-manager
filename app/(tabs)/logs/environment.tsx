import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getEnvironmentsForContext,
  getEnvironmentRecords,
  createEnvironmentRecord,
  deleteEnvironmentRecord,
  getEnvironmentPlants,
  createBulkPlantLog,
  getEnvironmentBulkLogs,
} from '../../../firebase/firestore';
import { Environment, EnvironmentRecord, Plant, BulkPlantLog, PlantLogType } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { PlantLogForm } from '../../../components/PlantLogForm';
import { LogTypeBadge, getLogTypeInfo } from '../../../components/LogTypeSelector';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

type LogMode = 'environment' | 'bulk_plant';

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

export default function EnvironmentLogsScreen() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [envRecords, setEnvRecords] = useState<EnvironmentRecord[]>([]);
  const [bulkLogs, setBulkLogs] = useState<BulkPlantLog[]>([]);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [envSelectModal, setEnvSelectModal] = useState(false);
  const [plantSelectModal, setPlantSelectModal] = useState(false);
  
  // Mode toggle
  const [logMode, setLogMode] = useState<LogMode>('environment');
  
  // Environment log fields
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [lightHours, setLightHours] = useState('');
  const [notes, setNotes] = useState('');
  
  // Bulk log state
  const [submitting, setSubmitting] = useState(false);
  
  const { userData, currentAssociation } = useAuth();

  const loadEnvironments = async () => {
    if (!userData) return;
    
    try {
      const userEnvironments = await getEnvironmentsForContext(userData.uid, currentAssociation?.id);
      setEnvironments(userEnvironments);
      if (userEnvironments.length > 0 && !selectedEnvironment) {
        setSelectedEnvironment(userEnvironments[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  const loadEnvRecords = async () => {
    if (!selectedEnvironment) return;
    
    try {
      // Load environment records
      const records = await getEnvironmentRecords(selectedEnvironment.id);
      setEnvRecords(records);
      
      // Load bulk logs separately - may fail if index is still building
      try {
        const bulk = await getEnvironmentBulkLogs(selectedEnvironment.id, undefined, 20);
        setBulkLogs(bulk);
      } catch (bulkError: any) {
        console.warn('[EnvironmentLogs] Failed to load bulk logs (index may be building):', bulkError.message);
        setBulkLogs([]);
      }
    } catch (error: any) {
      console.error('[EnvironmentLogs] Error loading records:', error);
      Alert.alert('Error', 'Failed to load records: ' + (error.message || 'Unknown error'));
    }
  };

  const loadPlants = async () => {
    if (!selectedEnvironment || !userData) return;
    
    try {
      const envPlants = await getEnvironmentPlants(selectedEnvironment.id, userData.uid);
      setPlants(envPlants);
      // Select all plants by default
      setSelectedPlants(envPlants.map(p => p.id));
    } catch (error) {
      console.error('Failed to load plants:', error);
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, [userData, currentAssociation]);

  useEffect(() => {
    if (selectedEnvironment) {
      loadEnvRecords();
      loadPlants();
    }
  }, [selectedEnvironment]);

  const handleAddEnvironmentRecord = async () => {
    if (!selectedEnvironment) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    if (!temp || !humidity || !lightHours) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const tempNum = parseFloat(temp);
    const humidityNum = parseFloat(humidity);
    const lightHoursNum = parseFloat(lightHours);

    if (isNaN(tempNum) || isNaN(humidityNum) || isNaN(lightHoursNum)) {
      Alert.alert('Error', 'Please enter valid numbers');
      return;
    }

    try {
      const envRecordData: any = {
        environmentId: selectedEnvironment.id,
        date: Date.now(),
        temp: tempNum,
        humidity: humidityNum,
        lightHours: lightHoursNum,
        notes,
      };
      
      // Only add associationId if it exists
      if (currentAssociation?.id) {
        envRecordData.associationId = currentAssociation.id;
      }
      
      await createEnvironmentRecord(envRecordData);

      setModalVisible(false);
      setTemp('');
      setHumidity('');
      setLightHours('');
      setNotes('');
      loadEnvRecords();
      Alert.alert('Success', 'Environment log added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add environment log');
    }
  };

  const handleAddBulkPlantLog = async (formData: any) => {
    if (!selectedEnvironment || !userData) {
      Alert.alert('Error', 'Please select an environment');
      return;
    }

    if (selectedPlants.length === 0) {
      Alert.alert('Error', 'Please select at least one plant');
      return;
    }

    setSubmitting(true);
    try {
      const bulkLogData: any = {
        ...formData,
        environmentId: selectedEnvironment.id,
        userId: userData.uid,
        plantIds: selectedPlants,
        date: Date.now(),
      };
      
      // Only add associationId if it exists
      if (currentAssociation?.id) {
        bulkLogData.associationId = currentAssociation.id;
      }
      
      await createBulkPlantLog(bulkLogData);

      setModalVisible(false);
      loadEnvRecords();
      Alert.alert(
        'Success', 
        `Activity logged for ${selectedPlants.length} plant${selectedPlants.length > 1 ? 's' : ''}!`
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save bulk log: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRecord = (recordId: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEnvironmentRecord(recordId);
              loadEnvRecords();
              Alert.alert('Success', 'Record deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  const togglePlantSelection = (plantId: string) => {
    if (selectedPlants.includes(plantId)) {
      setSelectedPlants(selectedPlants.filter(id => id !== plantId));
    } else {
      setSelectedPlants([...selectedPlants, plantId]);
    }
  };

  const selectAllPlants = () => {
    setSelectedPlants(plants.map(p => p.id));
  };

  const deselectAllPlants = () => {
    setSelectedPlants([]);
  };

  if (loading) {
    return <Loading message="Loading environment logs..." />;
  }

  if (environments.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No environments yet</Text>
          <Text style={styles.emptySubtext}>Create an environment first</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderEnvironmentRecord = ({ item }: { item: EnvironmentRecord }) => (
    <Card>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <View style={[styles.recordIcon, { backgroundColor: '#FF980020' }]}>
            <Ionicons name="thermometer" size={20} color="#FF9800" />
          </View>
          <View style={styles.recordText}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="thermometer-outline" size={16} color="#FF5722" />
                <Text style={styles.statText}>{item.temp}°C</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="water-outline" size={16} color="#2196F3" />
                <Text style={styles.statText}>{item.humidity}%</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="sunny-outline" size={16} color="#FFC107" />
                <Text style={styles.statText}>{item.lightHours}h</Text>
              </View>
            </View>
            <Text style={styles.recordDate}>
              {format(new Date(item.date), 'MMM dd, yyyy - HH:mm')}
            </Text>
            {item.notes && (
              <Text style={styles.recordNotes}>{item.notes}</Text>
            )}
          </View>
        </View>
        <TouchableOpacity onPress={() => handleDeleteRecord(item.id)}>
          <Ionicons name="trash-outline" size={24} color="#f44336" />
        </TouchableOpacity>
      </View>
    </Card>
  );

  const renderBulkLog = ({ item }: { item: BulkPlantLog }) => {
    const typeInfo = getLogTypeInfo(item.logType);
    return (
      <Card>
        <View style={styles.recordHeader}>
          <View style={styles.recordInfo}>
            <View style={[styles.recordIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
            </View>
            <View style={styles.recordText}>
              <View style={styles.bulkLogHeader}>
                <Text style={styles.bulkLogType}>{typeInfo.label}</Text>
                <View style={styles.bulkBadge}>
                  <Ionicons name="layers" size={12} color="#7B1FA2" />
                  <Text style={styles.bulkBadgeText}>{item.plantCount} plants</Text>
                </View>
              </View>
              <Text style={styles.recordDate}>
                {format(new Date(item.date), 'MMM dd, yyyy - HH:mm')}
              </Text>
              {item.notes && (
                <Text style={styles.recordNotes}>{item.notes}</Text>
              )}
            </View>
          </View>
        </View>
      </Card>
    );
  };

  // Combine and sort all logs
  const allLogs = [
    ...envRecords.map(r => ({ type: 'env' as const, data: r, date: r.date })),
    ...bulkLogs.map(b => ({ type: 'bulk' as const, data: b, date: b.date })),
  ].sort((a, b) => b.date - a.date);

  return (
    <SafeAreaView style={styles.container}>
      {/* Environment Selector */}
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Selected Environment:</Text>
        <TouchableOpacity
          style={styles.envSelector}
          onPress={() => setEnvSelectModal(true)}
        >
          {selectedEnvironment && (
            <View style={styles.selectedEnv}>
              <View
                style={[
                  styles.envIconSmall,
                  { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                ]}
              >
                <Ionicons
                  name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                  size={20}
                  color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                />
              </View>
              <View style={styles.envTextContainer}>
                <Text style={styles.envName}>{selectedEnvironment.name}</Text>
                <Text style={styles.plantCount}>{plants.length} plants</Text>
              </View>
            </View>
          )}
          <Ionicons name="chevron-down" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[
            styles.modeButton,
            logMode === 'environment' && styles.modeButtonActive,
          ]}
          onPress={() => setLogMode('environment')}
        >
          <Ionicons
            name="thermometer"
            size={18}
            color={logMode === 'environment' ? '#fff' : '#FF9800'}
          />
          <Text
            style={[
              styles.modeButtonText,
              logMode === 'environment' && styles.modeButtonTextActive,
            ]}
          >
            Environment
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.modeButton,
            logMode === 'bulk_plant' && styles.modeButtonActiveBulk,
          ]}
          onPress={() => setLogMode('bulk_plant')}
        >
          <Ionicons
            name="layers"
            size={18}
            color={logMode === 'bulk_plant' ? '#fff' : '#7B1FA2'}
          />
          <Text
            style={[
              styles.modeButtonText,
              logMode === 'bulk_plant' && styles.modeButtonTextActive,
            ]}
          >
            Bulk Plant Update
          </Text>
        </TouchableOpacity>
      </View>

      {/* Logs List */}
      <FlatList
        data={allLogs}
        keyExtractor={(item) => `${item.type}-${item.data.id}`}
        renderItem={({ item }) => 
          item.type === 'env' 
            ? renderEnvironmentRecord({ item: item.data as EnvironmentRecord })
            : renderBulkLog({ item: item.data as BulkPlantLog })
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No logs yet</Text>
          </View>
        }
      />

      <Button
        title={logMode === 'environment' ? "+ Add Environment Log" : "+ Bulk Plant Update"}
        onPress={() => setModalVisible(true)}
        style={styles.addButton}
      />

      {/* Environment Selection Modal */}
      <Modal
        visible={envSelectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setEnvSelectModal(false)}
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
                    setEnvSelectModal(false);
                  }}
                >
                  <View
                    style={[
                      styles.envIconSmall,
                      { backgroundColor: ENVIRONMENT_COLORS[env.type] + '20' },
                    ]}
                  >
                    <Ionicons
                      name={ENVIRONMENT_ICONS[env.type]}
                      size={20}
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
            <Button title="Cancel" onPress={() => setEnvSelectModal(false)} variant="secondary" />
          </View>
        </View>
      </Modal>

      {/* Add Log Modal - Environment Mode */}
      <Modal
        visible={modalVisible && logMode === 'environment'}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Environment Log</Text>
            {selectedEnvironment && (
              <View style={styles.selectedEnvInfo}>
                <View
                  style={[
                    styles.envIconSmall,
                    { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                  ]}
                >
                  <Ionicons
                    name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                    size={20}
                    color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                  />
                </View>
                <Text style={styles.selectedEnvName}>{selectedEnvironment.name}</Text>
              </View>
            )}
            <ScrollView>
              <Input
                label="Temperature (°C)"
                value={temp}
                onChangeText={setTemp}
                placeholder="e.g., 24.5"
                keyboardType="decimal-pad"
              />
              <Input
                label="Humidity (%)"
                value={humidity}
                onChangeText={setHumidity}
                placeholder="e.g., 65"
                keyboardType="decimal-pad"
              />
              <Input
                label="Light Hours"
                value={lightHours}
                onChangeText={setLightHours}
                placeholder="e.g., 18"
                keyboardType="decimal-pad"
              />
              <Input
                label="Notes (optional)"
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button title="Add Log" onPress={handleAddEnvironmentRecord} />
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
                variant="secondary"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Log Modal - Bulk Plant Mode */}
      <Modal
        visible={modalVisible && logMode === 'bulk_plant'}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.bulkModalContent}>
            <View style={styles.bulkModalHeader}>
              <Text style={styles.modalTitle}>Bulk Plant Update</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Environment & Plant Selection */}
            {selectedEnvironment && (
              <View style={styles.bulkEnvInfo}>
                <View
                  style={[
                    styles.envIconSmall,
                    { backgroundColor: ENVIRONMENT_COLORS[selectedEnvironment.type] + '20' },
                  ]}
                >
                  <Ionicons
                    name={ENVIRONMENT_ICONS[selectedEnvironment.type]}
                    size={20}
                    color={ENVIRONMENT_COLORS[selectedEnvironment.type]}
                  />
                </View>
                <Text style={styles.bulkEnvName}>{selectedEnvironment.name}</Text>
              </View>
            )}

            {/* Plant Selection */}
            <TouchableOpacity
              style={styles.plantSelectorButton}
              onPress={() => setPlantSelectModal(true)}
            >
              <View style={styles.plantSelectorContent}>
                <Ionicons name="leaf" size={20} color="#4CAF50" />
                <Text style={styles.plantSelectorText}>
                  {selectedPlants.length} of {plants.length} plants selected
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            {plants.length === 0 ? (
              <View style={styles.noPlantsMessage}>
                <Ionicons name="alert-circle-outline" size={48} color="#ccc" />
                <Text style={styles.noPlantsText}>No plants in this environment</Text>
              </View>
            ) : (
              <PlantLogForm
                onSubmit={handleAddBulkPlantLog}
                onCancel={() => setModalVisible(false)}
                submitLabel={`Apply to ${selectedPlants.length} Plants`}
                isLoading={submitting}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Plant Selection Modal */}
      <Modal
        visible={plantSelectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPlantSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.plantSelectHeader}>
              <Text style={styles.modalTitle}>Select Plants</Text>
              <View style={styles.selectAllButtons}>
                <TouchableOpacity onPress={selectAllPlants} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={deselectAllPlants} style={styles.selectAllButton}>
                  <Text style={styles.selectAllText}>None</Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView>
              {plants.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.plantOption}
                  onPress={() => togglePlantSelection(plant.id)}
                >
                  <View style={styles.plantOptionIcon}>
                    <Ionicons name="leaf" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.plantOptionInfo}>
                    <Text style={styles.plantOptionName}>{plant.strain}</Text>
                    <Text style={styles.plantOptionControl}>#{plant.controlNumber}</Text>
                  </View>
                  <View style={[
                    styles.checkbox,
                    selectedPlants.includes(plant.id) && styles.checkboxSelected
                  ]}>
                    {selectedPlants.includes(plant.id) && (
                      <Ionicons name="checkmark" size={18} color="#fff" />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.plantSelectFooter}>
              <Text style={styles.selectedCount}>
                {selectedPlants.length} plant{selectedPlants.length !== 1 ? 's' : ''} selected
              </Text>
              <Button
                title="Done"
                onPress={() => setPlantSelectModal(false)}
              />
            </View>
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
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  envSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedEnv: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  envIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  envTextContainer: {
    flex: 1,
  },
  envName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  plantCount: {
    fontSize: 12,
    color: '#666',
  },
  // Mode Toggle
  modeToggle: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FF9800',
  },
  modeButtonActiveBulk: {
    backgroundColor: '#7B1FA2',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modeButtonTextActive: {
    color: '#fff',
  },
  // List
  list: {
    padding: 16,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  recordInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  recordText: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  recordDate: {
    fontSize: 12,
    color: '#999',
  },
  recordNotes: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Bulk Log
  bulkLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  bulkLogType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bulkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bulkBadgeText: {
    fontSize: 11,
    color: '#7B1FA2',
    fontWeight: '600',
  },
  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  // Add Button
  addButton: {
    margin: 16,
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
    maxHeight: '80%',
  },
  bulkModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
    flex: 1,
  },
  bulkModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedEnvInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  selectedEnvName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginLeft: 12,
  },
  bulkEnvInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  bulkEnvName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7B1FA2',
    marginLeft: 12,
  },
  modalButtons: {
    marginTop: 8,
  },
  // Plant Selector
  plantSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#e8f5e9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  plantSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plantSelectorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2E7D32',
  },
  noPlantsMessage: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  noPlantsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  // Plant Select Modal
  plantSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectAllButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 6,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  plantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  plantOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plantOptionInfo: {
    flex: 1,
  },
  plantOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  plantOptionControl: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  plantSelectFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectedCount: {
    fontSize: 14,
    color: '#666',
  },
  // Env Options
  envOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  envOptionText: {
    flex: 1,
    marginLeft: 12,
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
});
