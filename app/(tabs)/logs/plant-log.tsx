import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getUserPlants,
  createPlantLog,
  getPlantLogs,
} from '../../../firebase/firestore';
import { Plant, PlantLog, PlantLogType } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { PlantLogForm } from '../../../components/PlantLogForm';
import { LogTypeBadge, getLogTypeInfo } from '../../../components/LogTypeSelector';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function PlantLogScreen() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [recentLogs, setRecentLogs] = useState<PlantLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [plantSelectModal, setPlantSelectModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { userData } = useAuth();

  const loadPlants = async () => {
    if (!userData) return;

    try {
      const userPlants = await getUserPlants(userData.uid);
      setPlants(userPlants);
      if (userPlants.length > 0 && !selectedPlant) {
        setSelectedPlant(userPlants[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentLogs = async () => {
    if (!selectedPlant) return;

    try {
      const logs = await getPlantLogs(selectedPlant.id, undefined, 10);
      setRecentLogs(logs);
    } catch (error: any) {
      console.warn('[PlantLog] Failed to load recent logs (index may be building):', error.message);
      setRecentLogs([]);
    }
  };

  useEffect(() => {
    loadPlants();
  }, [userData]);

  useEffect(() => {
    if (selectedPlant) {
      loadRecentLogs();
    }
  }, [selectedPlant]);

  const handleSubmitLog = async (formData: any) => {
    if (!selectedPlant || !userData) {
      Alert.alert('Error', 'Please select a plant');
      return;
    }

    setSubmitting(true);
    try {
      await createPlantLog({
        ...formData,
        plantId: selectedPlant.id,
        userId: userData.uid,
        date: Date.now(),
      });

      setModalVisible(false);
      loadRecentLogs();
      Alert.alert('Success', 'Activity logged successfully!');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save log: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Loading plants..." />;
  }

  if (plants.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No plants yet</Text>
          <Text style={styles.emptySubtext}>Create a plant first to log activities</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderLogItem = (log: PlantLog) => {
    const typeInfo = getLogTypeInfo(log.logType);
    
    return (
      <View key={log.id} style={styles.logItem}>
        <View style={[styles.logIcon, { backgroundColor: typeInfo.color + '20' }]}>
          <Ionicons name={typeInfo.icon as any} size={20} color={typeInfo.color} />
        </View>
        <View style={styles.logContent}>
          <View style={styles.logHeader}>
            <View style={styles.logTypeRow}>
              <Text style={styles.logType}>{typeInfo.label}</Text>
              {log.fromBulkUpdate && (
                <View style={styles.bulkBadge}>
                  <Ionicons name="layers" size={10} color="#7B1FA2" />
                  <Text style={styles.bulkBadgeText}>Bulk</Text>
                </View>
              )}
            </View>
            <Text style={styles.logDate}>
              {format(new Date(log.date), 'MMM dd, HH:mm')}
            </Text>
          </View>
          
          {/* Show relevant details based on log type */}
          <View style={styles.logDetails}>
            {log.waterAmountMl && (
              <Text style={styles.logDetail}>💧 {log.waterAmountMl}ml</Text>
            )}
            {log.phLevel && (
              <Text style={styles.logDetail}>pH: {log.phLevel}</Text>
            )}
            {log.ecPpm && (
              <Text style={styles.logDetail}>EC: {log.ecPpm}</Text>
            )}
            {log.nutrients && log.nutrients.length > 0 && (
              <Text style={styles.logDetail}>
                🧪 {log.nutrients.map(n => n.name).join(', ')}
              </Text>
            )}
            {log.leavesRemoved && (
              <Text style={styles.logDetail}>🍃 {log.leavesRemoved} leaves</Text>
            )}
            {log.trainingMethod && (
              <Text style={styles.logDetail}>📐 {log.trainingMethod}</Text>
            )}
            {log.treatmentProduct && (
              <Text style={styles.logDetail}>🏥 {log.treatmentProduct}</Text>
            )}
          </View>
          
          {log.notes && (
            <Text style={styles.logNotes} numberOfLines={2}>{log.notes}</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>Selected Plant:</Text>
        <TouchableOpacity
          style={styles.plantSelector}
          onPress={() => setPlantSelectModal(true)}
        >
          <View style={styles.selectedPlant}>
            <View style={styles.plantIcon}>
              <Ionicons name="leaf" size={20} color="#4CAF50" />
            </View>
            <View style={styles.plantTextContainer}>
              <Text style={styles.plantName}>{selectedPlant?.name}</Text>
              <View style={styles.plantMeta}>
                {selectedPlant?.controlNumber && (
                  <Text style={styles.controlNumber}>#{selectedPlant.controlNumber}</Text>
                )}
                {selectedPlant?.currentStage && (
                  <View style={styles.stageBadge}>
                    <Text style={styles.stageText}>{selectedPlant.currentStage}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Quick Log</Text>
          <View style={styles.quickActions}>
            {['watering', 'nutrient_feed', 'defoliation', 'lst'].map((type) => {
              const info = getLogTypeInfo(type as PlantLogType);
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.quickActionButton, { borderColor: info.color }]}
                  onPress={() => {
                    // Could pre-set the log type here
                    setModalVisible(true);
                  }}
                >
                  <Ionicons name={info.icon as any} size={24} color={info.color} />
                  <Text style={[styles.quickActionText, { color: info.color }]}>
                    {info.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Recent Logs */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <Text style={styles.logCount}>{recentLogs.length} logs</Text>
          </View>

          {recentLogs.length > 0 ? (
            recentLogs.map(renderLogItem)
          ) : (
            <View style={styles.emptyLogs}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyLogsText}>No activity logs yet</Text>
              <Text style={styles.emptyLogsSubtext}>
                Tap the button below to log your first activity
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>

      <Button
        title="+ Log New Activity"
        onPress={() => setModalVisible(true)}
        style={styles.addButton}
      />

      {/* Plant Selection Modal */}
      <Modal
        visible={plantSelectModal}
        animationType="slide"
        transparent
        onRequestClose={() => setPlantSelectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Plant</Text>
            <ScrollView>
              {plants.map((plant) => (
                <TouchableOpacity
                  key={plant.id}
                  style={styles.plantOption}
                  onPress={() => {
                    setSelectedPlant(plant);
                    setPlantSelectModal(false);
                  }}
                >
                  <View style={styles.plantOptionIcon}>
                    <Ionicons name="leaf" size={20} color="#4CAF50" />
                  </View>
                  <View style={styles.plantOptionInfo}>
                    <Text style={styles.plantOptionName}>{plant.name}</Text>
                    <View style={styles.plantOptionMeta}>
                      <Text style={styles.plantOptionControl}>#{plant.controlNumber}</Text>
                      <Text style={styles.plantOptionStrain}>{plant.strain}</Text>
                    </View>
                  </View>
                  {selectedPlant?.id === plant.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setPlantSelectModal(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Add Log Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.formModalContent}>
            <View style={styles.formModalHeader}>
              <Text style={styles.modalTitle}>Log Activity</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            {/* Plant info */}
            {selectedPlant && (
              <View style={styles.selectedPlantInfo}>
                <Ionicons name="leaf" size={18} color="#4CAF50" />
                <Text style={styles.selectedPlantName}>{selectedPlant.name}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlBadgeText}>#{selectedPlant.controlNumber}</Text>
                </View>
              </View>
            )}
            
            <PlantLogForm
              onSubmit={handleSubmitLog}
              onCancel={() => setModalVisible(false)}
              submitLabel="Save Activity Log"
              isLoading={submitting}
            />
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
  plantSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedPlant: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plantIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#4CAF5020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plantTextContainer: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  plantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  controlNumber: {
    fontSize: 12,
    color: '#666',
  },
  stageBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stageText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  logCount: {
    fontSize: 14,
    color: '#666',
  },
  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionButton: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '23%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  // Log Items
  logItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logContent: {
    flex: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  bulkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#E1BEE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bulkBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7B1FA2',
  },
  logDate: {
    fontSize: 12,
    color: '#999',
  },
  logDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  logDetail: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  logNotes: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  // Empty States
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  emptyLogs: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLogsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptyLogsSubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  // Add Button
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  // Modal Styles
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
    maxHeight: '70%',
  },
  formModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '90%',
    flex: 1,
  },
  formModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPlantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  selectedPlantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  controlBadge: {
    backgroundColor: '#c8e6c9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  controlBadgeText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '500',
  },
  // Plant Options
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
    backgroundColor: '#4CAF5020',
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
  plantOptionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  plantOptionControl: {
    fontSize: 12,
    color: '#666',
  },
  plantOptionStrain: {
    fontSize: 12,
    color: '#999',
  },
});

