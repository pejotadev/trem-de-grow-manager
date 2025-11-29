import React, { useState, useEffect } from 'react';
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
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createExtract,
  getUserHarvests,
} from '../../../firebase/firestore';
import { Harvest, ExtractType, ExtractionMethod } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DatePicker } from '../../../components/DatePicker';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const EXTRACT_TYPES: { value: ExtractType; label: string; description: string }[] = [
  { value: 'oil', label: 'Oil', description: 'Cannabis-infused oil' },
  { value: 'tincture', label: 'Tincture', description: 'Alcohol-based extract' },
  { value: 'concentrate', label: 'Concentrate', description: 'High potency extract' },
  { value: 'isolate', label: 'Isolate', description: 'Pure cannabinoid' },
  { value: 'full_spectrum', label: 'Full Spectrum', description: 'All cannabinoids preserved' },
  { value: 'broad_spectrum', label: 'Broad Spectrum', description: 'THC-free full spectrum' },
  { value: 'other', label: 'Other', description: 'Other extract type' },
];

const EXTRACTION_METHODS: { value: ExtractionMethod; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'co2', label: 'CO₂ Extraction', icon: 'cloud-outline' },
  { value: 'ethanol', label: 'Ethanol', icon: 'beaker-outline' },
  { value: 'butane', label: 'Butane (BHO)', icon: 'flame-outline' },
  { value: 'rosin', label: 'Rosin Press', icon: 'resize-outline' },
  { value: 'ice_water', label: 'Ice Water Hash', icon: 'snow-outline' },
  { value: 'olive_oil', label: 'Olive Oil', icon: 'water-outline' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function NewExtractScreen() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [selectedHarvests, setSelectedHarvests] = useState<Harvest[]>([]);

  // Form state
  const [name, setName] = useState('');
  const [extractType, setExtractType] = useState<ExtractType>('oil');
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('olive_oil');
  const [extractionDate, setExtractionDate] = useState<Date | null>(new Date());
  const [inputWeight, setInputWeight] = useState('');
  const [outputVolume, setOutputVolume] = useState('');
  const [outputWeight, setOutputWeight] = useState('');
  const [thcMgPerMl, setThcMgPerMl] = useState('');
  const [cbdMgPerMl, setCbdMgPerMl] = useState('');
  const [carrier, setCarrier] = useState('');
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [storageLocation, setStorageLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Modals
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [methodModalVisible, setMethodModalVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData || !userData.uid) {
      setLoading(false);
      return;
    }

    try {
      const harvestsData = await getUserHarvests(userData.uid);
      
      // Filter to harvests that have available weight
      const availableHarvests = harvestsData.filter(h => {
        const totalWeight = h.finalWeightGrams || h.dryWeightGrams || h.wetWeightGrams;
        const usedWeight = (h.distributedGrams || 0) + (h.extractedGrams || 0);
        return totalWeight - usedWeight > 0;
      });
      
      setHarvests(availableHarvests);
    } catch (error: any) {
      console.error('[NewExtract] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [userData]);

  const getAvailableWeight = (harvest: Harvest): number => {
    const totalWeight = harvest.finalWeightGrams || harvest.dryWeightGrams || harvest.wetWeightGrams;
    return totalWeight - (harvest.distributedGrams || 0) - (harvest.extractedGrams || 0);
  };

  const getTotalSelectedWeight = (): number => {
    return selectedHarvests.reduce((sum, h) => sum + getAvailableWeight(h), 0);
  };

  const toggleHarvestSelection = (harvest: Harvest) => {
    const isSelected = selectedHarvests.some(h => h.id === harvest.id);
    if (isSelected) {
      setSelectedHarvests(selectedHarvests.filter(h => h.id !== harvest.id));
    } else {
      setSelectedHarvests([...selectedHarvests, harvest]);
    }
  };

  const handleSubmit = async () => {
    if (!userData || !userData.uid) return;

    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for the extract');
      return;
    }

    if (selectedHarvests.length === 0) {
      Alert.alert('Error', 'Please select at least one source harvest');
      return;
    }

    const inputWeightNum = parseFloat(inputWeight) || getTotalSelectedWeight();
    if (inputWeightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid input weight');
      return;
    }

    // Validate input weight doesn't exceed available
    const totalAvailable = getTotalSelectedWeight();
    if (inputWeightNum > totalAvailable) {
      Alert.alert('Error', `Input weight cannot exceed available weight (${totalAvailable}g)`);
      return;
    }

    const outputVolumeNum = outputVolume ? parseFloat(outputVolume) : undefined;
    const outputWeightNum = outputWeight ? parseFloat(outputWeight) : undefined;

    if (!outputVolumeNum && !outputWeightNum) {
      Alert.alert('Error', 'Please enter output volume or weight');
      return;
    }

    // Validate dates
    if (!extractionDate) {
      Alert.alert('Error', 'Please select an extraction date');
      return;
    }

    const expirationDateNum: number | undefined = expirationDate?.getTime();

    setSubmitting(true);

    try {
      // Generate batch number from first harvest control number
      const batchNumber = selectedHarvests[0].controlNumber;

      await createExtract({
        userId: userData.uid,
        name: name.trim(),
        extractType,
        harvestIds: selectedHarvests.map(h => h.id),
        sourceControlNumbers: selectedHarvests.map(h => h.controlNumber),
        extractionDate: extractionDate.getTime(),
        extractionMethod,
        inputWeightGrams: inputWeightNum,
        ...(outputVolumeNum && { outputVolumeMl: outputVolumeNum }),
        ...(outputWeightNum && { outputWeightGrams: outputWeightNum }),
        ...(thcMgPerMl && { thcMgPerMl: parseFloat(thcMgPerMl) }),
        ...(cbdMgPerMl && { cbdMgPerMl: parseFloat(cbdMgPerMl) }),
        ...(carrier.trim() && { carrier: carrier.trim() }),
        batchNumber,
        ...(expirationDateNum && { expirationDate: expirationDateNum }),
        ...(storageLocation.trim() && { storageLocation: storageLocation.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: Date.now(),
      });

      Alert.alert('Success', 'Extract created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewExtract] Error creating extract:', error);
      Alert.alert('Error', 'Failed to create extract: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Loading message="Loading..." />;
  }

  const selectedTypeInfo = EXTRACT_TYPES.find(t => t.value === extractType);
  const selectedMethodInfo = EXTRACTION_METHODS.find(m => m.value === extractionMethod);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Basic Info */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="flask" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Extract Info</Text>
            </View>

            <Input
              label="Name *"
              value={name}
              onChangeText={setName}
              placeholder="e.g., Full Spectrum CBD Oil Batch 1"
            />

            <Text style={styles.inputLabel}>Extract Type *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setTypeModalVisible(true)}
            >
              <Text style={styles.selectorText}>{selectedTypeInfo?.label}</Text>
              <Text style={styles.selectorSubtext}>{selectedTypeInfo?.description}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Extraction Method *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setMethodModalVisible(true)}
            >
              <Ionicons name={selectedMethodInfo?.icon || 'beaker'} size={20} color="#FF5722" />
              <Text style={styles.selectorText}>{selectedMethodInfo?.label}</Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <DatePicker
              label="Extraction Date *"
              value={extractionDate}
              onChange={setExtractionDate}
              placeholder="Select extraction date"
              maximumDate={new Date()}
            />
          </Card>

          {/* Source Harvests */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="leaf" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Source Harvests *</Text>
            </View>

            <TouchableOpacity
              style={styles.harvestSelector}
              onPress={() => setHarvestModalVisible(true)}
            >
              {selectedHarvests.length === 0 ? (
                <Text style={styles.selectorPlaceholder}>Select source harvests...</Text>
              ) : (
                <View style={styles.selectedHarvestsPreview}>
                  <Text style={styles.selectedHarvestsCount}>
                    {selectedHarvests.length} harvest{selectedHarvests.length !== 1 ? 's' : ''} selected
                  </Text>
                  <Text style={styles.selectedHarvestsWeight}>
                    {getTotalSelectedWeight().toFixed(1)}g available
                  </Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {selectedHarvests.length > 0 && (
              <View style={styles.selectedHarvestsList}>
                {selectedHarvests.map((harvest) => (
                  <View key={harvest.id} style={styles.selectedHarvestItem}>
                    <View style={styles.harvestBadge}>
                      <Text style={styles.harvestBadgeText}>#{harvest.controlNumber}</Text>
                    </View>
                    <Text style={styles.harvestWeight}>{getAvailableWeight(harvest)}g</Text>
                    <TouchableOpacity onPress={() => toggleHarvestSelection(harvest)}>
                      <Ionicons name="close-circle" size={20} color="#f44336" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            <Input
              label="Input Weight (grams) *"
              value={inputWeight || (selectedHarvests.length > 0 ? getTotalSelectedWeight().toString() : '')}
              onChangeText={setInputWeight}
              placeholder={selectedHarvests.length > 0 ? `Max: ${getTotalSelectedWeight()}g` : '0'}
              keyboardType="decimal-pad"
            />
            <Text style={styles.inputHint}>
              Auto-calculated from selected harvests. Override if using less.
            </Text>
          </Card>

          {/* Output */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="beaker" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Output</Text>
            </View>

            <View style={styles.outputRow}>
              <View style={styles.outputInput}>
                <Input
                  label="Volume (ml)"
                  value={outputVolume}
                  onChangeText={setOutputVolume}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.outputInput}>
                <Input
                  label="Weight (grams)"
                  value={outputWeight}
                  onChangeText={setOutputWeight}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            <Input
              label="Carrier/Base"
              value={carrier}
              onChangeText={setCarrier}
              placeholder="e.g., MCT oil, olive oil, ethanol"
            />
          </Card>

          {/* Concentration */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Concentration (Optional)</Text>
            </View>

            <View style={styles.concentrationRow}>
              <View style={styles.concentrationInput}>
                <Input
                  label="THC (mg/ml)"
                  value={thcMgPerMl}
                  onChangeText={setThcMgPerMl}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.concentrationInput}>
                <Input
                  label="CBD (mg/ml)"
                  value={cbdMgPerMl}
                  onChangeText={setCbdMgPerMl}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
          </Card>

          {/* Storage & Expiration */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="archive" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Storage</Text>
            </View>

            <DatePicker
              label="Expiration Date"
              value={expirationDate}
              onChange={setExpirationDate}
              placeholder="Select expiration date"
              minimumDate={extractionDate || undefined}
            />

            <Input
              label="Storage Location"
              value={storageLocation}
              onChangeText={setStorageLocation}
              placeholder="e.g., Refrigerator, Dark cabinet"
            />

            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Submit */}
          <Button
            title={submitting ? 'Creating...' : 'Create Extract'}
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.submitButton}
          />

          <Button
            title="Cancel"
            onPress={() => router.back()}
            variant="secondary"
            disabled={submitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Harvest Selection Modal */}
      <Modal
        visible={harvestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHarvestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Source Harvests</Text>
            <Text style={styles.modalSubtitle}>
              Select one or more harvests to use as source material
            </Text>
            <ScrollView>
              {harvests.length === 0 ? (
                <Text style={styles.emptyText}>No harvests with available weight</Text>
              ) : (
                harvests.map((harvest) => {
                  const isSelected = selectedHarvests.some(h => h.id === harvest.id);
                  const available = getAvailableWeight(harvest);
                  
                  return (
                    <TouchableOpacity
                      key={harvest.id}
                      style={[styles.harvestOption, isSelected && styles.harvestOptionSelected]}
                      onPress={() => toggleHarvestSelection(harvest)}
                    >
                      <View style={styles.harvestOptionContent}>
                        <View style={styles.harvestBadge}>
                          <Text style={styles.harvestBadgeText}>#{harvest.controlNumber}</Text>
                        </View>
                        <View style={styles.harvestOptionInfo}>
                          <Text style={styles.harvestOptionWeight}>{available}g available</Text>
                          <Text style={styles.harvestOptionDate}>
                            {format(new Date(harvest.harvestDate), 'MMM dd, yyyy')}
                          </Text>
                        </View>
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark-circle" size={24} color="#FF5722" />
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
            <Button
              title={`Done (${selectedHarvests.length} selected)`}
              onPress={() => setHarvestModalVisible(false)}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Extract Type Modal */}
      <Modal
        visible={typeModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTypeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Extract Type</Text>
            <ScrollView>
              {EXTRACT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={styles.typeOption}
                  onPress={() => {
                    setExtractType(type.value);
                    setTypeModalVisible(false);
                  }}
                >
                  <View style={styles.typeOptionContent}>
                    <Text style={styles.typeOptionLabel}>{type.label}</Text>
                    <Text style={styles.typeOptionDescription}>{type.description}</Text>
                  </View>
                  {extractType === type.value && (
                    <Ionicons name="checkmark" size={24} color="#FF5722" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setTypeModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Extraction Method Modal */}
      <Modal
        visible={methodModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setMethodModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Extraction Method</Text>
            <ScrollView>
              {EXTRACTION_METHODS.map((method) => (
                <TouchableOpacity
                  key={method.value}
                  style={styles.methodOption}
                  onPress={() => {
                    setExtractionMethod(method.value);
                    setMethodModalVisible(false);
                  }}
                >
                  <Ionicons name={method.icon} size={24} color="#FF5722" />
                  <Text style={styles.methodOptionLabel}>{method.label}</Text>
                  {extractionMethod === method.value && (
                    <Ionicons name="checkmark" size={24} color="#FF5722" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setMethodModalVisible(false)}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
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
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 10,
  },
  selectorText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  selectorSubtext: {
    fontSize: 12,
    color: '#999',
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: '#999',
    flex: 1,
  },
  harvestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedHarvestsPreview: {
    flex: 1,
  },
  selectedHarvestsCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  selectedHarvestsWeight: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  selectedHarvestsList: {
    marginTop: 12,
    gap: 8,
  },
  selectedHarvestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  harvestBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  harvestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  harvestWeight: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  inputHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  outputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  outputInput: {
    flex: 1,
  },
  concentrationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  concentrationInput: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#FF5722',
    marginTop: 8,
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalButton: {
    backgroundColor: '#FF5722',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  harvestOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  harvestOptionSelected: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: -24,
    paddingHorizontal: 24,
  },
  harvestOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  harvestOptionInfo: {
    flex: 1,
  },
  harvestOptionWeight: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  harvestOptionDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeOptionContent: {
    flex: 1,
  },
  typeOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeOptionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 14,
  },
  methodOptionLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
});


