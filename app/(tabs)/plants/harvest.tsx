import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getPlant,
  getEnvironment,
  createHarvest,
  createStage,
  updatePlant,
  updateHarvest,
} from '../../../firebase/firestore';
import { Plant, Environment, StageName, HarvestPurpose, HarvestStatus } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DatePicker } from '../../../components/DatePicker';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { showSuccess, showError, showWarning } from '../../../utils/toast';

const HARVEST_PURPOSES: { value: HarvestPurpose; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'patient', label: 'Patient', icon: 'medkit' },
  { value: 'research', label: 'Research', icon: 'flask' },
  { value: 'extract', label: 'Extract', icon: 'beaker' },
  { value: 'personal', label: 'Personal', icon: 'person' },
  { value: 'donation', label: 'Donation', icon: 'gift' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

const QUALITY_GRADES: { value: 'A' | 'B' | 'C'; label: string; color: string }[] = [
  { value: 'A', label: 'Grade A', color: '#4CAF50' },
  { value: 'B', label: 'Grade B', color: '#FF9800' },
  { value: 'C', label: 'Grade C', color: '#f44336' },
];

const HARVESTABLE_STAGES: StageName[] = ['Flower', 'Drying', 'Curing'];

export default function HarvestScreen() {
  const { plantId } = useLocalSearchParams();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [harvestDate, setHarvestDate] = useState<Date | null>(new Date());
  const [wetWeight, setWetWeight] = useState('');
  const [purpose, setPurpose] = useState<HarvestPurpose>('personal');
  const [qualityGrade, setQualityGrade] = useState<'A' | 'B' | 'C' | null>(null);
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [updateStageToDrying, setUpdateStageToDrying] = useState(true); // Default to true for better workflow

  // Modals
  const [purposeModalVisible, setPurposeModalVisible] = useState(false);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!plantId || typeof plantId !== 'string') {
      console.log('[Harvest] Invalid plant ID:', plantId);
      return;
    }

    try {
      console.log('[Harvest] Loading plant data for ID:', plantId);
      const plantData = await getPlant(plantId);

      if (!plantData) {
        setLoading(false);
        return;
      }

      setPlant(plantData);

      if (plantData.environmentId) {
        const envData = await getEnvironment(plantData.environmentId);
        setEnvironment(envData);
      }
    } catch (error: any) {
      console.error('[Harvest] Error loading data:', error);
      showError('Failed to load plant data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [plantId]);

  const isHarvestableStage = plant?.currentStage && HARVESTABLE_STAGES.includes(plant.currentStage);

  const handleSubmit = async () => {
    if (!plant || !userData || !userData.uid) return;

    // Validation
    if (!wetWeight.trim()) {
      showWarning('Please enter the wet weight');
      return;
    }

    const wetWeightNum = parseFloat(wetWeight);
    if (isNaN(wetWeightNum) || wetWeightNum <= 0) {
      showWarning('Please enter a valid wet weight');
      return;
    }

    // Validate harvest date
    if (!harvestDate) {
      showWarning('Please select a harvest date');
      return;
    }

    setSubmitting(true);

    try {
      // Determine initial status based on whether we're updating stage to Drying
      const willUpdateToDrying = updateStageToDrying && plant.currentStage === 'Flower';
      const initialStatus: HarvestStatus = willUpdateToDrying ? 'drying' : 'fresh';
      
      // Create harvest record
      const harvestId = await createHarvest({
        plantId: plant.id,
        userId: userData.uid,
        harvestDate: harvestDate.getTime(),
        wetWeightGrams: wetWeightNum,
        status: initialStatus,
        purpose,
        ...(qualityGrade && { qualityGrade }),
        ...(storageLocation.trim() && { storageLocation: storageLocation.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: Date.now(),
      });

      // Update plant stage to Drying if selected
      if (willUpdateToDrying) {
        const now = Date.now();
        await createStage({
          plantId: plant.id,
          name: 'Drying',
          startDate: now,
        });
        await updatePlant(plant.id, { currentStage: 'Drying' });
      }

      // Get the harvest to show control number
      const { getHarvest } = await import('../../../firebase/firestore');
      const createdHarvest = await getHarvest(harvestId);

      const stageMessage = willUpdateToDrying ? ' Stage updated to Drying.' : '';
      showSuccess(
        `Control #${createdHarvest?.controlNumber || 'N/A'} - ${wetWeightNum}g (${purpose})${stageMessage}`,
        'Harvest Recorded! 🌿',
        () => router.back()
      );
    } catch (error: any) {
      console.error('[Harvest] Error creating harvest:', error);
      showError('Failed to create harvest: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Loading plant data..." />;
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

  const selectedPurpose = HARVEST_PURPOSES.find((p) => p.value === purpose);
  const selectedGrade = QUALITY_GRADES.find((g) => g.value === qualityGrade);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Plant Info Header */}
          <Card>
            <View style={styles.plantHeader}>
              <View style={styles.plantIcon}>
                <Ionicons name="leaf" size={28} color="#4CAF50" />
              </View>
              <View style={styles.plantInfo}>
                <Text style={styles.plantName}>{plant.strain}</Text>
                <View style={styles.plantMeta}>
                  <View style={styles.controlBadge}>
                    <Text style={styles.controlText}>#{plant.controlNumber}</Text>
                  </View>
                  {plant.currentStage && (
                    <View style={styles.stageBadge}>
                      <Text style={styles.stageText}>{plant.currentStage}</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </Card>

          {/* Warning if not harvestable stage */}
          {!isHarvestableStage && (
            <View style={styles.warningCard}>
              <Ionicons name="warning" size={24} color="#FF9800" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>Stage Warning</Text>
                <Text style={styles.warningText}>
                  This plant is in the "{plant.currentStage || 'Unknown'}" stage. Harvesting is
                  typically done in Flower, Drying, or Curing stages.
                </Text>
              </View>
            </View>
          )}

          {/* Harvest Form */}
          <Card>
            <Text style={styles.sectionTitle}>Harvest Details</Text>

            {/* Harvest Date */}
            <DatePicker
              label="Harvest Date *"
              value={harvestDate}
              onChange={setHarvestDate}
              placeholder="Select harvest date"
              maximumDate={new Date()}
            />

            {/* Wet Weight */}
            <Input
              label="Wet Weight (grams) *"
              value={wetWeight}
              onChangeText={setWetWeight}
              placeholder="Enter weight in grams"
              keyboardType="decimal-pad"
            />

            {/* Purpose Selector */}
            <Text style={styles.inputLabel}>Purpose *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setPurposeModalVisible(true)}
            >
              {selectedPurpose && (
                <View style={styles.selectedOption}>
                  <Ionicons name={selectedPurpose.icon} size={20} color="#4CAF50" />
                  <Text style={styles.selectorText}>{selectedPurpose.label}</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {/* Patient selector placeholder (for Phase 3) */}
            {purpose === 'patient' && (
              <View style={styles.patientPlaceholder}>
                <Ionicons name="person-circle-outline" size={20} color="#999" />
                <Text style={styles.patientPlaceholderText}>
                  Patient selection coming in Phase 3
                </Text>
              </View>
            )}

            {/* Quality Grade Selector */}
            <Text style={styles.inputLabel}>Quality Grade (optional)</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setGradeModalVisible(true)}
            >
              {selectedGrade ? (
                <View style={styles.selectedOption}>
                  <View style={[styles.gradeDot, { backgroundColor: selectedGrade.color }]} />
                  <Text style={styles.selectorText}>{selectedGrade.label}</Text>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select quality grade...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {/* Storage Location */}
            <Input
              label="Storage Location (optional)"
              value={storageLocation}
              onChangeText={setStorageLocation}
              placeholder="e.g., Jar #1, Cure Room A"
            />

            {/* Notes */}
            <Input
              label="Notes (optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              multiline
              numberOfLines={3}
              style={styles.notesInput}
            />
          </Card>

          {/* Update Stage Option */}
          {plant.currentStage === 'Flower' && (
            <Card>
              <View style={styles.stageUpdateRow}>
                <View style={styles.stageUpdateLabel}>
                  <Ionicons name="sync" size={20} color="#4CAF50" />
                  <Text style={styles.stageUpdateText}>Update plant stage to "Drying"</Text>
                </View>
                <Switch
                  value={updateStageToDrying}
                  onValueChange={setUpdateStageToDrying}
                  trackColor={{ false: '#e0e0e0', true: '#81C784' }}
                  thumbColor={updateStageToDrying ? '#4CAF50' : '#f4f3f4'}
                />
              </View>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            title={submitting ? 'Recording Harvest...' : 'Record Harvest'}
            onPress={handleSubmit}
            disabled={submitting}
          />

          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Purpose Selection Modal */}
      <Modal
        visible={purposeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPurposeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Purpose</Text>
            <ScrollView>
              {HARVEST_PURPOSES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setPurpose(p.value);
                    setPurposeModalVisible(false);
                  }}
                >
                  <Ionicons name={p.icon} size={24} color="#4CAF50" />
                  <Text style={styles.modalOptionText}>{p.label}</Text>
                  {purpose === p.value && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setPurposeModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Grade Selection Modal */}
      <Modal
        visible={gradeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setGradeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Quality Grade</Text>
            <ScrollView>
              {QUALITY_GRADES.map((g) => (
                <TouchableOpacity
                  key={g.value}
                  style={styles.modalOption}
                  onPress={() => {
                    setQualityGrade(g.value);
                    setGradeModalVisible(false);
                  }}
                >
                  <View style={[styles.gradeDotLarge, { backgroundColor: g.color }]} />
                  <Text style={styles.modalOptionText}>{g.label}</Text>
                  {qualityGrade === g.value && (
                    <Ionicons name="checkmark" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setQualityGrade(null);
                  setGradeModalVisible(false);
                }}
              >
                <View style={[styles.gradeDotLarge, { backgroundColor: '#ccc' }]} />
                <Text style={styles.modalOptionText}>None</Text>
                {qualityGrade === null && (
                  <Ionicons name="checkmark" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setGradeModalVisible(false)}
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
  keyboardView: {
    flex: 1,
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
  // Plant Header
  plantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  plantStrain: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  plantMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  stageBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stageText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  // Warning Card
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 10,
    marginVertical: 8,
    gap: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  // Form
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
    color: '#333',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  gradeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  gradeDotLarge: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  patientPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  patientPlaceholderText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Stage Update
  stageUpdateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageUpdateLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stageUpdateText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
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
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});


