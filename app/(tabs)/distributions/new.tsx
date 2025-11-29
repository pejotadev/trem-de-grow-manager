import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  createDistribution,
  getUserPatients,
  getHarvest,
  getUserHarvests,
  getExtract,
  getUserExtracts,
} from '../../../firebase/firestore';
import { Patient, Harvest, ProductType, Extract } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const PRODUCT_TYPES: { value: ProductType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'flower', label: 'Flower', icon: 'leaf' },
  { value: 'extract', label: 'Extract', icon: 'flask' },
  { value: 'oil', label: 'Oil', icon: 'water' },
  { value: 'edible', label: 'Edible', icon: 'nutrition' },
  { value: 'topical', label: 'Topical', icon: 'hand-left' },
  { value: 'other', label: 'Other', icon: 'ellipsis-horizontal' },
];

export default function NewDistributionScreen() {
  const { harvestId: initialHarvestId, patientId: initialPatientId, extractId: initialExtractId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Data
  const [patients, setPatients] = useState<Patient[]>([]);
  const [harvests, setHarvests] = useState<Harvest[]>([]);
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);
  const [selectedExtract, setSelectedExtract] = useState<Extract | null>(null);

  // Form state
  const [productType, setProductType] = useState<ProductType>('flower');
  const [distributionDate, setDistributionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [quantityGrams, setQuantityGrams] = useState('');
  const [quantityMl, setQuantityMl] = useState('');
  const [quantityUnits, setQuantityUnits] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [signatureConfirmation, setSignatureConfirmation] = useState(false);
  const [notes, setNotes] = useState('');

  // Modals
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);
  const [extractModalVisible, setExtractModalVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    console.log('[NewDistribution] loadData called, userData:', userData);
    
    if (!userData || !userData.uid) {
      console.log('[NewDistribution] No userData, skipping load');
      setLoading(false);
      return;
    }

    console.log('[NewDistribution] Fetching data for user:', userData.uid);

    try {
      const [patientsData, harvestsData, extractsData] = await Promise.all([
        getUserPatients(userData.uid),
        getUserHarvests(userData.uid),
        getUserExtracts(userData.uid),
      ]);
      
      console.log('[NewDistribution] Data fetched - patients:', patientsData.length, 'harvests:', harvestsData.length, 'extracts:', extractsData.length);

      // Filter to only active patients
      const activePatients = patientsData.filter(p => p.status === 'active');
      setPatients(activePatients);

      // Show all harvests that are not fully distributed (no status filter - show all)
      console.log('[NewDistribution] All harvests received:', harvestsData.length, harvestsData.map(h => ({
        id: h.id,
        controlNumber: h.controlNumber,
        status: h.status,
        wetWeight: h.wetWeightGrams,
        dryWeight: h.dryWeightGrams,
        finalWeight: h.finalWeightGrams,
        distributed: h.distributedGrams,
        extracted: h.extractedGrams,
      })));
      
      const availableHarvests = harvestsData.filter(h => {
        // Exclude only fully distributed harvests
        if (h.status === 'distributed') {
          console.log(`[NewDistribution] Harvest ${h.controlNumber} excluded - fully distributed`);
          return false;
        }
        
        // Calculate available weight - use the best available weight (only positive values)
        // Priority: finalWeightGrams > dryWeightGrams > wetWeightGrams
        let totalWeight = 0;
        if (h.finalWeightGrams && h.finalWeightGrams > 0) {
          totalWeight = h.finalWeightGrams;
        } else if (h.dryWeightGrams && h.dryWeightGrams > 0) {
          totalWeight = h.dryWeightGrams;
        } else if (h.wetWeightGrams && h.wetWeightGrams > 0) {
          totalWeight = h.wetWeightGrams;
        }
        
        const usedWeight = (h.distributedGrams || 0) + (h.extractedGrams || 0);
        const availableWeight = totalWeight - usedWeight;
        
        console.log(`[NewDistribution] Harvest ${h.controlNumber}: status=${h.status}, total=${totalWeight}g, used=${usedWeight}g, available=${availableWeight}g`);
        
        // Show harvest if it has any positive weight
        return totalWeight > 0;
      });
      
      console.log('[NewDistribution] Available harvests:', availableHarvests.length);
      setHarvests(availableHarvests);

      // Filter to extracts that have available volume
      const availableExtracts = extractsData.filter(e => {
        // For now, we don't track distributed volume from extracts, so all are available
        return (e.outputVolumeMl || 0) > 0 || (e.outputWeightGrams || 0) > 0;
      });
      setExtracts(availableExtracts);

      // Pre-select if params provided
      if (initialPatientId && typeof initialPatientId === 'string') {
        const patient = activePatients.find(p => p.id === initialPatientId);
        if (patient) {
          setSelectedPatient(patient);
          setReceivedBy(patient.name);
        }
      }

      if (initialHarvestId && typeof initialHarvestId === 'string') {
        const harvest = await getHarvest(initialHarvestId);
        if (harvest) {
          setSelectedHarvest(harvest);
          setBatchNumber(harvest.controlNumber);
          setProductDescription(`${harvest.controlNumber} - Flower`);
          setProductType('flower');
        }
      }

      if (initialExtractId && typeof initialExtractId === 'string') {
        const extract = await getExtract(initialExtractId);
        if (extract) {
          setSelectedExtract(extract);
          setBatchNumber(extract.controlNumber);
          setProductDescription(`${extract.controlNumber} - ${extract.name}`);
          setProductType('extract');
        }
      }
    } catch (error: any) {
      console.error('[NewDistribution] Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      console.log('[NewDistribution] Screen focused, loading data. userData:', userData?.uid);
      loadData();
    }, [userData])
  );

  const getHarvestTotalWeight = (harvest: Harvest): number => {
    // Use the best available weight (only positive values)
    // Priority: finalWeightGrams > dryWeightGrams > wetWeightGrams
    if (harvest.finalWeightGrams && harvest.finalWeightGrams > 0) {
      return harvest.finalWeightGrams;
    }
    if (harvest.dryWeightGrams && harvest.dryWeightGrams > 0) {
      return harvest.dryWeightGrams;
    }
    if (harvest.wetWeightGrams && harvest.wetWeightGrams > 0) {
      return harvest.wetWeightGrams;
    }
    return 0;
  };

  const getAvailableWeight = (harvest: Harvest): number => {
    const totalWeight = getHarvestTotalWeight(harvest);
    return totalWeight - (harvest.distributedGrams || 0) - (harvest.extractedGrams || 0);
  };

  const getHarvestWeightDisplay = (harvest: Harvest): string => {
    const total = getHarvestTotalWeight(harvest);
    const available = getAvailableWeight(harvest);
    
    if (available > 0) {
      return `${available}g available`;
    }
    if (total > 0) {
      return `${total}g (all distributed)`;
    }
    return 'Weight pending';
  };

  const getExtractQuantityDisplay = (extract: Extract): string => {
    const parts: string[] = [];
    if (extract.outputVolumeMl) parts.push(`${extract.outputVolumeMl}ml`);
    if (extract.outputWeightGrams) parts.push(`${extract.outputWeightGrams}g`);
    return parts.join(' / ') || 'N/A';
  };

  const handleSubmit = async () => {
    if (!userData || !userData.uid) return;

    // Validation
    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    if (!receivedBy.trim()) {
      Alert.alert('Error', 'Please enter who received the product');
      return;
    }

    if (!productDescription.trim()) {
      Alert.alert('Error', 'Please enter a product description');
      return;
    }

    if (!batchNumber.trim()) {
      Alert.alert('Error', 'Please enter a batch number');
      return;
    }

    const qtyGrams = quantityGrams ? parseFloat(quantityGrams) : undefined;
    const qtyMl = quantityMl ? parseFloat(quantityMl) : undefined;
    const qtyUnits = quantityUnits ? parseInt(quantityUnits, 10) : undefined;

    if (!qtyGrams && !qtyMl && !qtyUnits) {
      Alert.alert('Error', 'Please enter at least one quantity');
      return;
    }

    // Validate against available harvest weight
    if (selectedHarvest && qtyGrams) {
      const available = getAvailableWeight(selectedHarvest);
      if (qtyGrams > available) {
        Alert.alert('Error', `Only ${available}g available from this harvest`);
        return;
      }
    }

    // Parse date
    const dateObj = new Date(distributionDate);
    if (isNaN(dateObj.getTime())) {
      Alert.alert('Error', 'Please enter a valid date (YYYY-MM-DD)');
      return;
    }

    setSubmitting(true);

    try {
      await createDistribution({
        userId: userData.uid,
        patientId: selectedPatient.id,
        patientName: selectedPatient.name,
        productType,
        ...(selectedHarvest && { harvestId: selectedHarvest.id }),
        ...(selectedHarvest && { harvestControlNumber: selectedHarvest.controlNumber }),
        ...(selectedExtract && { extractId: selectedExtract.id }),
        ...(selectedExtract && { extractControlNumber: selectedExtract.controlNumber }),
        batchNumber: batchNumber.trim(),
        productDescription: productDescription.trim(),
        ...(qtyGrams && { quantityGrams: qtyGrams }),
        ...(qtyMl && { quantityMl: qtyMl }),
        ...(qtyUnits && { quantityUnits: qtyUnits }),
        distributionDate: dateObj.getTime(),
        receivedBy: receivedBy.trim(),
        signatureConfirmation,
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: Date.now(),
      });

      Alert.alert('Success', 'Distribution recorded successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewDistribution] Error creating distribution:', error);
      Alert.alert('Error', 'Failed to create distribution: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setReceivedBy(patient.name);
    setPatientModalVisible(false);
  };

  const handleHarvestSelect = (harvest: Harvest) => {
    setSelectedHarvest(harvest);
    setSelectedExtract(null); // Clear extract selection
    setBatchNumber(harvest.controlNumber);
    setProductDescription(`${harvest.controlNumber} - Flower`);
    setProductType('flower');
    setHarvestModalVisible(false);
  };

  const handleExtractSelect = (extract: Extract) => {
    setSelectedExtract(extract);
    setSelectedHarvest(null); // Clear harvest selection
    setBatchNumber(extract.controlNumber);
    setProductDescription(`${extract.controlNumber} - ${extract.name}`);
    setProductType('extract');
    setExtractModalVisible(false);
  };

  if (loading) {
    return <Loading message="Loading..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Patient Selection */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>1. Patient *</Text>
            </View>

            <TouchableOpacity
              style={styles.selector}
              onPress={() => setPatientModalVisible(true)}
            >
              {selectedPatient ? (
                <View style={styles.selectedOption}>
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <Text style={styles.selectorText}>{selectedPatient.name}</Text>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select patient...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {patients.length === 0 && (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={18} color="#FF9800" />
                <Text style={styles.warningText}>No active patients. Register a patient first.</Text>
              </View>
            )}
          </Card>

          {/* Product Type Selection - NOW SECOND */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>2. Product Type *</Text>
            </View>

            <View style={styles.productTypeGrid}>
              {PRODUCT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.productTypeButton,
                    productType === type.value && styles.productTypeButtonActive,
                  ]}
                  onPress={() => {
                    setProductType(type.value);
                    // Clear source selection when changing product type
                    if (type.value === 'flower' && selectedExtract) {
                      setSelectedExtract(null);
                      setBatchNumber('');
                      setProductDescription('');
                    } else if (type.value !== 'flower' && selectedHarvest) {
                      setSelectedHarvest(null);
                      setBatchNumber('');
                      setProductDescription('');
                    }
                  }}
                >
                  <Ionicons
                    name={type.icon}
                    size={20}
                    color={productType === type.value ? '#fff' : '#666'}
                  />
                  <Text
                    style={[
                      styles.productTypeText,
                      productType === type.value && styles.productTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Card>

          {/* Source Selection - NOW THIRD, filtered by product type */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>3. Source (Optional)</Text>
            </View>

            {productType === 'flower' ? (
              <>
                <Text style={styles.inputLabel}>From Harvest (Drying/Curing)</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setHarvestModalVisible(true)}
                >
                  {selectedHarvest ? (
                    <View style={styles.selectedOption}>
                      <View style={[styles.harvestBadge, selectedHarvest.status === 'curing' && styles.curingBadge]}>
                        <Text style={styles.harvestBadgeText}>
                          #{selectedHarvest.controlNumber} ({selectedHarvest.status})
                        </Text>
                      </View>
                      <Text style={styles.selectorText}>
                        {getHarvestWeightDisplay(selectedHarvest)}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>Select harvest...</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>
                
                {harvests.length === 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="information-circle" size={18} color="#2196F3" />
                    <Text style={styles.infoText}>No harvests available. Create a harvest from a plant first.</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>From Extract</Text>
                <TouchableOpacity
                  style={styles.selector}
                  onPress={() => setExtractModalVisible(true)}
                >
                  {selectedExtract ? (
                    <View style={styles.selectedOption}>
                      <View style={styles.extractBadge}>
                        <Ionicons name="flask" size={14} color="#fff" />
                        <Text style={styles.extractBadgeText}>#{selectedExtract.controlNumber}</Text>
                      </View>
                      <Text style={styles.selectorText}>{selectedExtract.name}</Text>
                    </View>
                  ) : (
                    <Text style={styles.selectorPlaceholder}>Select extract...</Text>
                  )}
                  <Ionicons name="chevron-down" size={20} color="#666" />
                </TouchableOpacity>

                {extracts.length === 0 && (
                  <View style={styles.warningBox}>
                    <Ionicons name="information-circle" size={18} color="#2196F3" />
                    <Text style={styles.infoText}>No extracts available</Text>
                  </View>
                )}
              </>
            )}

            {(selectedHarvest || selectedExtract) && (
              <TouchableOpacity
                style={styles.clearSourceButton}
                onPress={() => {
                  setSelectedHarvest(null);
                  setSelectedExtract(null);
                  setBatchNumber('');
                  setProductDescription('');
                }}
              >
                <Ionicons name="close-circle" size={18} color="#f44336" />
                <Text style={styles.clearSourceText}>Clear source selection</Text>
              </TouchableOpacity>
            )}
          </Card>

          {/* Product Details */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>4. Product Details</Text>
            </View>

            <Input
              label="Product Description *"
              value={productDescription}
              onChangeText={setProductDescription}
              placeholder="e.g., H-GH-2025-00001 - Dried Flower"
            />

            <Input
              label="Batch Number *"
              value={batchNumber}
              onChangeText={setBatchNumber}
              placeholder="e.g., H-GH-2025-00001"
            />
          </Card>

          {/* Quantity */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="scale" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Quantity</Text>
            </View>

            <View style={styles.quantityRow}>
              <View style={styles.quantityInput}>
                <Input
                  label="Grams"
                  value={quantityGrams}
                  onChangeText={setQuantityGrams}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.quantityInput}>
                <Input
                  label="Milliliters"
                  value={quantityMl}
                  onChangeText={setQuantityMl}
                  placeholder="0"
                  keyboardType="decimal-pad"
                />
              </View>
              <View style={styles.quantityInput}>
                <Input
                  label="Units"
                  value={quantityUnits}
                  onChangeText={setQuantityUnits}
                  placeholder="0"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {selectedHarvest && quantityGrams && (
              <View style={styles.availabilityInfo}>
                <Text style={styles.availabilityText}>
                  Available: {getAvailableWeight(selectedHarvest)}g from {selectedHarvest.controlNumber}
                </Text>
              </View>
            )}
          </Card>

          {/* Distribution Details */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="gift" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Distribution Details</Text>
            </View>

            <Input
              label="Distribution Date *"
              value={distributionDate}
              onChangeText={setDistributionDate}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Received By *"
              value={receivedBy}
              onChangeText={setReceivedBy}
              placeholder="Name of person who received the product"
            />

            <View style={styles.signatureRow}>
              <View style={styles.signatureLabel}>
                <Ionicons name="create" size={20} color="#7B1FA2" />
                <Text style={styles.signatureLabelText}>Signature Confirmed</Text>
              </View>
              <Switch
                value={signatureConfirmation}
                onValueChange={setSignatureConfirmation}
                trackColor={{ false: '#e0e0e0', true: '#CE93D8' }}
                thumbColor={signatureConfirmation ? '#7B1FA2' : '#f4f3f4'}
              />
            </View>

            <Input
              label="Notes (Optional)"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Submit */}
          <Button
            title={submitting ? 'Recording...' : 'Record Distribution'}
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

      {/* Patient Selection Modal */}
      <Modal
        visible={patientModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPatientModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Patient</Text>
            <ScrollView>
              {patients.map((patient) => (
                <TouchableOpacity
                  key={patient.id}
                  style={styles.modalOption}
                  onPress={() => handlePatientSelect(patient)}
                >
                  <View style={styles.patientAvatar}>
                    <Ionicons name="person" size={18} color="#fff" />
                  </View>
                  <View style={styles.modalOptionInfo}>
                    <Text style={styles.modalOptionText}>{patient.name}</Text>
                    <Text style={styles.modalOptionSubtext}>{patient.medicalCondition || 'No condition specified'}</Text>
                  </View>
                  {selectedPatient?.id === patient.id && (
                    <Ionicons name="checkmark" size={24} color="#7B1FA2" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setPatientModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Harvest Selection Modal */}
      <Modal
        visible={harvestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHarvestModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Harvest</Text>
            <ScrollView>
              {harvests.length === 0 ? (
                <Text style={styles.emptyModalText}>No harvests with available weight</Text>
              ) : (
                harvests.map((harvest) => (
                  <TouchableOpacity
                    key={harvest.id}
                    style={styles.modalOption}
                    onPress={() => handleHarvestSelect(harvest)}
                  >
                    <View style={[styles.harvestBadge, harvest.status === 'curing' && styles.curingBadge]}>
                      <Text style={styles.harvestBadgeText}>#{harvest.controlNumber}</Text>
                    </View>
                    <View style={styles.modalOptionInfo}>
                      <Text style={styles.modalOptionText}>
                        {getHarvestWeightDisplay(harvest)}
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        {(harvest.status || 'unknown').toUpperCase()} • {format(new Date(harvest.harvestDate), 'MMM dd, yyyy')}
                      </Text>
                    </View>
                    {selectedHarvest?.id === harvest.id && (
                      <Ionicons name="checkmark" size={24} color="#7B1FA2" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setHarvestModalVisible(false)}
              variant="secondary"
            />
          </View>
        </View>
      </Modal>

      {/* Extract Selection Modal */}
      <Modal
        visible={extractModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setExtractModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Extract</Text>
            <ScrollView>
              {extracts.length === 0 ? (
                <Text style={styles.emptyModalText}>No extracts available</Text>
              ) : (
                extracts.map((extract) => (
                  <TouchableOpacity
                    key={extract.id}
                    style={styles.modalOption}
                    onPress={() => handleExtractSelect(extract)}
                  >
                    <View style={styles.extractBadge}>
                      <Ionicons name="flask" size={14} color="#fff" />
                      <Text style={styles.extractBadgeText}>#{extract.controlNumber}</Text>
                    </View>
                    <View style={styles.modalOptionInfo}>
                      <Text style={styles.modalOptionText}>{extract.name}</Text>
                      <Text style={styles.modalOptionSubtext}>
                        {getExtractQuantityDisplay(extract)}
                      </Text>
                    </View>
                    {selectedExtract?.id === extract.id && (
                      <Ionicons name="checkmark" size={24} color="#7B1FA2" />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setExtractModalVisible(false)}
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
  patientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  harvestBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  curingBadge: {
    backgroundColor: '#FF9800',
  },
  harvestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  extractBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  extractBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  selectorDisabled: {
    opacity: 0.5,
  },
  clearSourceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 6,
  },
  clearSourceText: {
    fontSize: 13,
    color: '#f44336',
  },
  emptyModalText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#E65100',
    flex: 1,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    flex: 1,
  },
  productTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  productTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 6,
  },
  productTypeButtonActive: {
    backgroundColor: '#7B1FA2',
    borderColor: '#7B1FA2',
  },
  productTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  productTypeTextActive: {
    color: '#fff',
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quantityInput: {
    flex: 1,
  },
  availabilityInfo: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  availabilityText: {
    fontSize: 13,
    color: '#2E7D32',
  },
  signatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  signatureLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signatureLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  submitButton: {
    backgroundColor: '#7B1FA2',
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
  },
  modalOptionSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
});

