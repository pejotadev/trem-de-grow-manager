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
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getUserEnvironments,
  getEnvironmentRecords,
  createEnvironmentRecord,
  deleteEnvironmentRecord,
} from '../../../firebase/firestore';
import { Environment, EnvironmentRecord } from '../../../types';
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

export default function EnvironmentLogsScreen() {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment | null>(null);
  const [envRecords, setEnvRecords] = useState<EnvironmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [envSelectModal, setEnvSelectModal] = useState(false);
  const [temp, setTemp] = useState('');
  const [humidity, setHumidity] = useState('');
  const [lightHours, setLightHours] = useState('');
  const [notes, setNotes] = useState('');
  const { userData } = useAuth();

  const loadEnvironments = async () => {
    if (!userData) return;
    
    try {
      const userEnvironments = await getUserEnvironments(userData.uid);
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
      const records = await getEnvironmentRecords(selectedEnvironment.id);
      setEnvRecords(records);
    } catch (error) {
      Alert.alert('Error', 'Failed to load environment records');
    }
  };

  useEffect(() => {
    loadEnvironments();
  }, [userData]);

  useEffect(() => {
    if (selectedEnvironment) {
      loadEnvRecords();
    }
  }, [selectedEnvironment]);

  const handleAddRecord = async () => {
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
      await createEnvironmentRecord({
        environmentId: selectedEnvironment.id,
        date: Date.now(),
        temp: tempNum,
        humidity: humidityNum,
        lightHours: lightHoursNum,
        notes,
      });

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

  const renderRecord = ({ item }: { item: EnvironmentRecord }) => (
    <Card>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Ionicons name="thermometer" size={24} color="#FF9800" />
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

  return (
    <SafeAreaView style={styles.container}>
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
              <Text style={styles.envName}>{selectedEnvironment.name}</Text>
            </View>
          )}
          <Ionicons name="chevron-down" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={envRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="thermometer-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No environment logs yet</Text>
          </View>
        }
      />

      <Button
        title="+ Add Environment Log"
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

      {/* Add Record Modal */}
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
              <Button title="Add Log" onPress={handleAddRecord} />
              <Button
                title="Cancel"
                onPress={() => setModalVisible(false)}
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
  envName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
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
  recordText: {
    flex: 1,
    marginLeft: 12,
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
  addButton: {
    margin: 16,
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
  },
  modalButtons: {
    marginTop: 8,
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
