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
  createOrder,
  getUserPatients,
  getUserHarvests,
  getUserExtracts,
} from '../../../firebase/firestore';
import { Patient, Harvest, ProductType, Extract, OrderStatus } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const PRODUCT_TYPES: { value: ProductType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'flower', label: 'Flower (Curing)', icon: 'leaf' },
  { value: 'extract', label: 'Extract', icon: 'flask' },
  { value: 'oil', label: 'Oil', icon: 'water' },
];

export default function NewOrderScreen() {
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
  const [quantityGrams, setQuantityGrams] = useState('');
  const [quantityMl, setQuantityMl] = useState('');
  const [notes, setNotes] = useState('');

  // Modals
  const [patientModalVisible, setPatientModalVisible] = useState(false);
  const [harvestModalVisible, setHarvestModalVisible] = useState(false);
  const [extractModalVisible, setExtractModalVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!userData || !userData.uid) {
      setLoading(false);
      return;
    }

    try {
      const [patientsData, harvestsData, extractsData] = await Promise.all([
        getUserPatients(userData.uid),
        getUserHarvests(userData.uid),
        getUserExtracts(userData.uid),
      ]);

      // Filter to only active patients
      const activePatients = patientsData.filter(p => p.status === 'active');
      setPatients(activePatients);

      // Filter to harvests in curing status with available weight
      const curingHarvests = harvestsData.filter(h => {
        if (h.status !== 'curing') return false;
        const availableWeight = (h.finalWeightGrams || h.dryWeightGrams || h.wetWeightGrams) - (h.distributedGrams || 0) - (h.extractedGrams || 0);
        return availableWeight > 0;
      });
      setHarvests(curingHarvests);

      // Available extracts
      const availableExtracts = extractsData.filter(e => {
        return (e.outputVolumeMl || 0) > 0 || (e.outputWeightGrams || 0) > 0;
      });
      setExtracts(availableExtracts);
    } catch (error: any) {
      console.error('[NewOrder] Error loading data:', error);
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

  const getPatientAllowance = (patient: Patient, type: ProductType): number => {
    switch (type) {
      case 'flower':
        return (patient.allowanceFlowerThcGrams || 0) + (patient.allowanceFlowerCbdGrams || 0);
      case 'extract':
        return patient.allowanceExtractGrams || 0;
      case 'oil':
        return patient.allowanceOilGrams || 0;
      default:
        return 0;
    }
  };

  const handleSubmit = async () => {
    if (!userData || !userData.uid) return;

    if (!selectedPatient) {
      Alert.alert('Error', 'Please select a patient');
      return;
    }

    const qtyGrams = quantityGrams ? parseFloat(quantityGrams) : undefined;
    const qtyMl = quantityMl ? parseFloat(quantityMl) : undefined;

    if (!qtyGrams && !qtyMl) {
      Alert.alert('Error', 'Please enter a quantity');
      return;
    }

    // Validate against patient allowance
    const allowance = getPatientAllowance(selectedPatient, productType);
    if (qtyGrams && qtyGrams > allowance && allowance > 0) {
      Alert.alert(
        'Exceeds Allowance',
        `Patient's monthly allowance for ${productType} is ${allowance}g. Requested: ${qtyGrams}g.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Create Anyway', onPress: () => submitOrder(qtyGrams, qtyMl) },
        ]
      );
      return;
    }

    await submitOrder(qtyGrams, qtyMl);
  };

  const submitOrder = async (qtyGrams?: number, qtyMl?: number) => {
    setSubmitting(true);

    try {
      await createOrder({
        userId: userData!.uid,
        patientId: selectedPatient!.id,
        patientName: selectedPatient!.name,
        productType,
        ...(selectedHarvest && { harvestId: selectedHarvest.id }),
        ...(selectedHarvest && { harvestControlNumber: selectedHarvest.controlNumber }),
        ...(selectedExtract && { extractId: selectedExtract.id }),
        ...(selectedExtract && { extractControlNumber: selectedExtract.controlNumber }),
        ...(qtyGrams && { requestedQuantityGrams: qtyGrams }),
        ...(qtyMl && { requestedQuantityMl: qtyMl }),
        status: 'pending' as OrderStatus,
        ...(notes.trim() && { notes: notes.trim() }),
        requestedAt: Date.now(),
        createdAt: Date.now(),
      });

      Alert.alert('Success', 'Order created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewOrder] Error creating order:', error);
      Alert.alert('Error', 'Failed to create order: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientModalVisible(false);
  };

  const handleHarvestSelect = (harvest: Harvest) => {
    setSelectedHarvest(harvest);
    setSelectedExtract(null);
    setProductType('flower');
    setHarvestModalVisible(false);
  };

  const handleExtractSelect = (extract: Extract) => {
    setSelectedExtract(extract);
    setSelectedHarvest(null);
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
              <Text style={styles.sectionTitle}>Patient *</Text>
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
                  <View style={styles.patientInfo}>
                    <Text style={styles.selectorText}>{selectedPatient.name}</Text>
                    <Text style={styles.allowanceText}>
                      Allowance: {getPatientAllowance(selectedPatient, productType)}g ({productType})
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select patient...</Text>
              )}
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </Card>

          {/* Product Type */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Product Type *</Text>
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
                    if (type.value !== 'flower') setSelectedHarvest(null);
                    if (type.value !== 'extract') setSelectedExtract(null);
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

          {/* Source Selection */}
          {productType === 'flower' && (
            <Card>
              <View style={styles.sectionHeader}>
                <Ionicons name="leaf" size={20} color="#4CAF50" />
                <Text style={styles.sectionTitle}>Select Curing Harvest</Text>
              </View>

              <TouchableOpacity
                style={styles.selector}
                onPress={() => setHarvestModalVisible(true)}
              >
                {selectedHarvest ? (
                  <View style={styles.selectedOption}>
                    <View style={styles.harvestBadge}>
                      <Text style={styles.harvestBadgeText}>#{selectedHarvest.controlNumber}</Text>
                    </View>
                    <Text style={styles.selectorText}>
                      {getAvailableWeight(selectedHarvest)}g available
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.selectorPlaceholder}>Select curing harvest...</Text>
                )}
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>

              {harvests.length === 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={18} color="#FF9800" />
                  <Text style={styles.warningText}>No harvests in curing status available.</Text>
                </View>
              )}
            </Card>
          )}

          {productType === 'extract' && (
            <Card>
              <View style={styles.sectionHeader}>
                <Ionicons name="flask" size={20} color="#FF9800" />
                <Text style={styles.sectionTitle}>Select Extract</Text>
              </View>

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
            </Card>
          )}

          {/* Quantity */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="scale" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Requested Quantity *</Text>
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
              {(productType === 'extract' || productType === 'oil') && (
                <View style={styles.quantityInput}>
                  <Input
                    label="Milliliters"
                    value={quantityMl}
                    onChangeText={setQuantityMl}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              )}
            </View>

            {selectedPatient && quantityGrams && (
              <View style={styles.allowanceInfo}>
                <Text style={styles.allowanceInfoText}>
                  Patient allowance: {getPatientAllowance(selectedPatient, productType)}g/month
                </Text>
              </View>
            )}
          </Card>

          {/* Notes */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            </View>

            <Input
              label=""
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes for this order..."
              multiline
              numberOfLines={3}
            />
          </Card>

          {/* Submit */}
          <Button
            title={submitting ? 'Creating...' : 'Create Order'}
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
                    <Text style={styles.modalOptionSubtext}>
                      Allowances: Oil {patient.allowanceOilGrams || 0}g | Extract {patient.allowanceExtractGrams || 0}g | Flower {(patient.allowanceFlowerThcGrams || 0) + (patient.allowanceFlowerCbdGrams || 0)}g
                    </Text>
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
            <Text style={styles.modalTitle}>Select Curing Harvest</Text>
            <ScrollView>
              {harvests.length === 0 ? (
                <Text style={styles.emptyModalText}>No curing harvests available</Text>
              ) : (
                harvests.map((harvest) => (
                  <TouchableOpacity
                    key={harvest.id}
                    style={styles.modalOption}
                    onPress={() => handleHarvestSelect(harvest)}
                  >
                    <View style={styles.harvestBadge}>
                      <Text style={styles.harvestBadgeText}>#{harvest.controlNumber}</Text>
                    </View>
                    <View style={styles.modalOptionInfo}>
                      <Text style={styles.modalOptionText}>
                        {getAvailableWeight(harvest)}g available
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        Curing • {format(new Date(harvest.harvestDate), 'MMM dd, yyyy')}
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
                        {extract.outputVolumeMl ? `${extract.outputVolumeMl}ml` : ''} {extract.outputWeightGrams ? `${extract.outputWeightGrams}g` : ''}
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
    flex: 1,
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
  patientInfo: {
    flex: 1,
  },
  allowanceText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  productTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  allowanceInfo: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  allowanceInfoText: {
    fontSize: 13,
    color: '#2E7D32',
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
  emptyModalText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 24,
  },
});


