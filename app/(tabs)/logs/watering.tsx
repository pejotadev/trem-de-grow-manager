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
  getUserPlants,
  getPlantWaterRecords,
  createWaterRecord,
  deleteWaterRecord,
} from '../../../firebase/firestore';
import { Plant, WaterRecord } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

export default function WateringLogsScreen() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const [waterRecords, setWaterRecords] = useState<WaterRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [plantSelectModal, setPlantSelectModal] = useState(false);
  const [ingredients, setIngredients] = useState('');
  const [notes, setNotes] = useState('');
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

  const loadWaterRecords = async () => {
    if (!selectedPlant) return;
    
    try {
      const records = await getPlantWaterRecords(selectedPlant.id);
      setWaterRecords(records);
    } catch (error) {
      Alert.alert('Error', 'Failed to load water records');
    }
  };

  useEffect(() => {
    loadPlants();
  }, [userData]);

  useEffect(() => {
    if (selectedPlant) {
      loadWaterRecords();
    }
  }, [selectedPlant]);

  const handleAddRecord = async () => {
    if (!selectedPlant) {
      Alert.alert('Error', 'Please select a plant');
      return;
    }

    if (!ingredients) {
      Alert.alert('Error', 'Please enter at least one ingredient');
      return;
    }

    try {
      const ingredientList = ingredients.split(',').map((i) => i.trim()).filter(Boolean);
      await createWaterRecord({
        plantId: selectedPlant.id,
        date: Date.now(),
        ingredients: ingredientList,
        notes,
      });

      setModalVisible(false);
      setIngredients('');
      setNotes('');
      loadWaterRecords();
      Alert.alert('Success', 'Watering log added!');
    } catch (error) {
      Alert.alert('Error', 'Failed to add watering log');
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
              await deleteWaterRecord(recordId);
              loadWaterRecords();
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
    return <Loading message="Loading watering logs..." />;
  }

  if (plants.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="leaf-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No plants yet</Text>
          <Text style={styles.emptySubtext}>Create a plant first</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderRecord = ({ item }: { item: WaterRecord }) => (
    <Card>
      <View style={styles.recordHeader}>
        <View style={styles.recordInfo}>
          <Ionicons name="water" size={24} color="#2196F3" />
          <View style={styles.recordText}>
            <Text style={styles.recordTitle}>
              {item.ingredients.join(', ')}
            </Text>
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
              {selectedPlant?.controlNumber && (
                <Text style={styles.controlNumber}>#{selectedPlant.controlNumber}</Text>
              )}
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={waterRecords}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="water-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No watering logs yet</Text>
          </View>
        }
      />

      <Button
        title="+ Add Watering Log"
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
                  <View style={styles.plantOptionInfo}>
                    <View style={styles.plantOptionIcon}>
                      <Ionicons name="leaf" size={20} color="#4CAF50" />
                    </View>
                    <View style={styles.plantOptionTextContainer}>
                      <Text style={styles.plantOptionText}>{plant.name}</Text>
                      <View style={styles.plantMeta}>
                        <View style={styles.controlBadge}>
                          <Text style={styles.controlBadgeText}>#{plant.controlNumber}</Text>
                        </View>
                        <Text style={styles.strainText}>{plant.strain}</Text>
                      </View>
                    </View>
                  </View>
                  {selectedPlant?.id === plant.id && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button title="Cancel" onPress={() => setPlantSelectModal(false)} variant="secondary" />
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
            <Text style={styles.modalTitle}>Add Watering Log</Text>
            {selectedPlant && (
              <View style={styles.selectedPlantInfo}>
                <View style={styles.plantIcon}>
                  <Ionicons name="leaf" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.selectedPlantName}>{selectedPlant.name}</Text>
                <View style={styles.controlBadge}>
                  <Text style={styles.controlBadgeText}>#{selectedPlant.controlNumber}</Text>
                </View>
              </View>
            )}
            <ScrollView>
              <Input
                label="Ingredients (comma separated)"
                value={ingredients}
                onChangeText={setIngredients}
                placeholder="e.g., Water, Nutrient A, Nutrient B"
                multiline
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
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#4CAF5020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  plantTextContainer: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  controlNumber: {
    fontSize: 12,
    color: '#666',
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
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
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
  selectedPlantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  selectedPlantName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  modalButtons: {
    marginTop: 8,
  },
  plantOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  plantOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  plantOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#4CAF5020',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  plantOptionTextContainer: {
    flex: 1,
  },
  plantOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  plantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  controlBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  strainText: {
    fontSize: 12,
    color: '#999',
  },
});
