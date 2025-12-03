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
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getHarvest,
  getPlant,
  updateHarvest,
  deleteHarvest,
  getHarvestDistributions,
  getHarvestExtracts,
} from '../../../firebase/firestore';
import { Harvest, Plant, HarvestStatus, HarvestPurpose, Distribution, Extract } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { AuditHistoryModal } from '../../../components/AuditHistoryModal';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const HARVEST_STATUS_INFO: Record<HarvestStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; description: string }> = {
  fresh: { label: 'Fresh', color: '#4CAF50', icon: 'leaf', description: 'Just harvested, not yet drying' },
  drying: { label: 'Drying', color: '#FF9800', icon: 'sunny', description: 'Currently drying' },
  curing: { label: 'Curing', color: '#9C27B0', icon: 'time', description: 'Curing in jars, ready for use' },
  processed: { label: 'Processed', color: '#2196F3', icon: 'checkmark-circle', description: 'Fully processed' },
  distributed: { label: 'Distributed', color: '#607D8B', icon: 'gift', description: 'Fully distributed' },
};

const HARVEST_PURPOSE_LABELS: Record<HarvestPurpose, string> = {
  patient: 'Patient',
  research: 'Research',
  extract: 'Extract',
  personal: 'Personal',
  donation: 'Donation',
  other: 'Other',
};

export default function HarvestDetailScreen() {
  const { id } = useLocalSearchParams();
  const [harvest, setHarvest] = useState<Harvest | null>(null);
  const [plant, setPlant] = useState<Plant | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [extracts, setExtracts] = useState<Extract[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Update weight modal
  const [weightModalVisible, setWeightModalVisible] = useState(false);
  const [weightType, setWeightType] = useState<'dry' | 'final'>('dry');
  const [newWeight, setNewWeight] = useState('');
  const [trimWeight, setTrimWeight] = useState('');
  const [updatingWeight, setUpdatingWeight] = useState(false);

  // Update status modal
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  
  // Audit history modal
  const [auditHistoryVisible, setAuditHistoryVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    try {
      const harvestData = await getHarvest(id);
      setHarvest(harvestData);

      if (harvestData?.plantId) {
        const plantData = await getPlant(harvestData.plantId);
        setPlant(plantData);
      }

      // Load related distributions and extracts
      const [distData, extractData] = await Promise.all([
        getHarvestDistributions(id),
        getHarvestExtracts(id),
      ]);
      setDistributions(distData);
      setExtracts(extractData);
    } catch (error: any) {
      console.error('[HarvestDetail] Error loading data:', error);
      Alert.alert('Error', 'Failed to load harvest data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getAvailableWeight = (): number => {
    if (!harvest) return 0;
    const totalWeight = harvest.finalWeightGrams || harvest.dryWeightGrams || harvest.wetWeightGrams;
    return Math.max(0, totalWeight - (harvest.distributedGrams || 0) - (harvest.extractedGrams || 0));
  };

  const handleUpdateWeight = async () => {
    if (!harvest || !id || typeof id !== 'string') return;

    const weightNum = parseFloat(newWeight);
    if (isNaN(weightNum) || weightNum <= 0) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    // Validate against wet weight
    if (weightNum > harvest.wetWeightGrams) {
      Alert.alert('Error', 'Weight cannot exceed wet weight');
      return;
    }

    const trimNum = trimWeight ? parseFloat(trimWeight) : undefined;
    if (trimWeight && (isNaN(trimNum!) || trimNum! < 0)) {
      Alert.alert('Error', 'Please enter a valid trim weight');
      return;
    }

    setUpdatingWeight(true);

    try {
      const updateData: Partial<Harvest> = {};

      if (weightType === 'dry') {
        updateData.dryWeightGrams = weightNum;
        if (harvest.status === 'fresh') {
          updateData.status = 'drying';
        }
      } else {
        updateData.finalWeightGrams = weightNum;
        if (trimNum !== undefined) {
          updateData.trimWeightGrams = trimNum;
        }
        if (harvest.status === 'drying') {
          updateData.status = 'curing';
        }
      }

      await updateHarvest(id, updateData);
      setWeightModalVisible(false);
      setNewWeight('');
      setTrimWeight('');
      loadData();

      const lossPercent = ((harvest.wetWeightGrams - weightNum) / harvest.wetWeightGrams * 100).toFixed(1);
      Alert.alert(
        'Weight Updated!',
        `${weightType === 'dry' ? 'Dry' : 'Final'} Weight: ${weightNum}g\nWeight Loss: ${lossPercent}%`
      );
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update weight: ' + (error.message || 'Unknown error'));
    } finally {
      setUpdatingWeight(false);
    }
  };

  const handleUpdateStatus = async (newStatus: HarvestStatus) => {
    if (!harvest || !id || typeof id !== 'string') return;

    try {
      await updateHarvest(id, { status: newStatus });
      setStatusModalVisible(false);
      loadData();
      Alert.alert('Success', `Status updated to ${HARVEST_STATUS_INFO[newStatus].label}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Harvest',
      'Are you sure you want to delete this harvest? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deleteHarvest(id);
              Alert.alert('Done', 'Harvest deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete harvest');
            }
          },
        },
      ]
    );
  };

  const openWeightModal = (type: 'dry' | 'final') => {
    setWeightType(type);
    setNewWeight('');
    setTrimWeight('');
    setWeightModalVisible(true);
  };

  if (loading) {
    return <Loading message="Loading harvest..." />;
  }

  if (!harvest) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Harvest not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = HARVEST_STATUS_INFO[harvest.status];
  const availableWeight = getAvailableWeight();
  const totalWeight = harvest.finalWeightGrams || harvest.dryWeightGrams || harvest.wetWeightGrams;
  const usedWeight = (harvest.distributedGrams || 0) + (harvest.extractedGrams || 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header Card */}
        <Card>
          <View style={styles.header}>
            <View style={[styles.statusIconLarge, { backgroundColor: statusInfo.color + '20' }]}>
              <Ionicons name={statusInfo.icon} size={32} color={statusInfo.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.controlNumber}>#{harvest.controlNumber}</Text>
              <TouchableOpacity
                style={[styles.statusBadgeLarge, { backgroundColor: statusInfo.color }]}
                onPress={() => setStatusModalVisible(true)}
              >
                <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                <Ionicons name="chevron-down" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.statusDescription}>{statusInfo.description}</Text>

          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={18} color="#666" />
            <Text style={styles.dateText}>
              Harvested {format(new Date(harvest.harvestDate), 'EEEE, MMMM dd, yyyy')}
            </Text>
          </View>
        </Card>

        {/* Source Plant */}
        {plant && (
          <TouchableOpacity onPress={() => router.push(`/(tabs)/plants/${plant.id}`)}>
            <Card>
              <View style={styles.plantRow}>
                <View style={[styles.plantIcon, plant.deletedAt && styles.plantIconDeleted]}>
                  <Ionicons name="leaf" size={24} color={plant.deletedAt ? '#999' : '#4CAF50'} />
                </View>
                <View style={styles.plantInfo}>
                  <View style={styles.plantLabelRow}>
                    <Text style={styles.plantLabel}>Source Plant</Text>
                    {plant.deletedAt && (
                      <View style={styles.deletedBadge}>
                        <Ionicons name="archive-outline" size={12} color="#fff" />
                        <Text style={styles.deletedBadgeText}>Archived</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.plantName, plant.deletedAt && styles.plantNameDeleted]}>{plant.strain}</Text>
                  <Text style={styles.plantStrain}>#{plant.controlNumber}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {/* Weight Tracking */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="scale" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Weight Tracking</Text>
          </View>

          <View style={styles.weightTracker}>
            {/* Wet Weight */}
            <View style={styles.weightStep}>
              <View style={[styles.weightStepIcon, styles.weightStepComplete]}>
                <Ionicons name="water" size={20} color="#fff" />
              </View>
              <View style={styles.weightStepContent}>
                <Text style={styles.weightStepLabel}>Wet Weight</Text>
                <Text style={styles.weightStepValue}>{harvest.wetWeightGrams}g</Text>
              </View>
            </View>

            <View style={styles.weightConnector} />

            {/* Dry Weight */}
            <View style={styles.weightStep}>
              <View style={[
                styles.weightStepIcon,
                harvest.dryWeightGrams ? styles.weightStepComplete : styles.weightStepPending
              ]}>
                <Ionicons name="sunny" size={20} color={harvest.dryWeightGrams ? '#fff' : '#999'} />
              </View>
              <View style={styles.weightStepContent}>
                <Text style={styles.weightStepLabel}>Dry Weight</Text>
                {harvest.dryWeightGrams ? (
                  <View>
                    <Text style={styles.weightStepValue}>{harvest.dryWeightGrams}g</Text>
                    <Text style={styles.weightLoss}>
                      -{((harvest.wetWeightGrams - harvest.dryWeightGrams) / harvest.wetWeightGrams * 100).toFixed(1)}% loss
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.addWeightButton}
                    onPress={() => openWeightModal('dry')}
                  >
                    <Ionicons name="add-circle" size={20} color="#FF9800" />
                    <Text style={styles.addWeightText}>Add Dry Weight</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.weightConnector} />

            {/* Final Weight */}
            <View style={styles.weightStep}>
              <View style={[
                styles.weightStepIcon,
                harvest.finalWeightGrams ? styles.weightStepComplete : styles.weightStepPending
              ]}>
                <Ionicons name="cube" size={20} color={harvest.finalWeightGrams ? '#fff' : '#999'} />
              </View>
              <View style={styles.weightStepContent}>
                <Text style={styles.weightStepLabel}>Final Weight</Text>
                {harvest.finalWeightGrams ? (
                  <View>
                    <Text style={styles.weightStepValue}>{harvest.finalWeightGrams}g</Text>
                    {harvest.trimWeightGrams && (
                      <Text style={styles.trimWeight}>Trim: {harvest.trimWeightGrams}g</Text>
                    )}
                  </View>
                ) : harvest.dryWeightGrams ? (
                  <TouchableOpacity
                    style={styles.addWeightButton}
                    onPress={() => openWeightModal('final')}
                  >
                    <Ionicons name="add-circle" size={20} color="#9C27B0" />
                    <Text style={styles.addWeightText}>Add Final Weight</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.weightPendingText}>Waiting for dry weight</Text>
                )}
              </View>
            </View>
          </View>
        </Card>

        {/* Inventory Status */}
        {(harvest.status === 'curing' || harvest.status === 'processed') && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="cube" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Inventory Status</Text>
            </View>

            <View style={styles.inventoryGrid}>
              <View style={[styles.inventoryItem, styles.inventoryTotal]}>
                <Text style={styles.inventoryLabel}>Total</Text>
                <Text style={styles.inventoryValue}>{totalWeight}g</Text>
              </View>
              <View style={[styles.inventoryItem, styles.inventoryAvailable]}>
                <Text style={styles.inventoryLabel}>Available</Text>
                <Text style={[styles.inventoryValue, styles.inventoryValueGreen]}>{availableWeight}g</Text>
              </View>
              <View style={styles.inventoryItem}>
                <Text style={styles.inventoryLabel}>Distributed</Text>
                <Text style={styles.inventoryValue}>{harvest.distributedGrams || 0}g</Text>
              </View>
              <View style={styles.inventoryItem}>
                <Text style={styles.inventoryLabel}>Extracted</Text>
                <Text style={styles.inventoryValue}>{harvest.extractedGrams || 0}g</Text>
              </View>
            </View>

            {availableWeight > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.distributeButton]}
                  onPress={() => router.push(`/(tabs)/distributions/new?harvestId=${harvest.id}`)}
                >
                  <Ionicons name="gift" size={20} color="#7B1FA2" />
                  <Text style={styles.actionButtonText}>Distribute</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.extractButton]}
                  onPress={() => router.push(`/(tabs)/extracts/new?harvestId=${harvest.id}`)}
                >
                  <Ionicons name="flask" size={20} color="#FF5722" />
                  <Text style={styles.actionButtonText}>Extract</Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* Harvest Details */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="information-circle" size={20} color="#4CAF50" />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Purpose</Text>
            <Text style={styles.detailValue}>{HARVEST_PURPOSE_LABELS[harvest.purpose]}</Text>
          </View>

          {harvest.qualityGrade && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Quality Grade</Text>
              <View style={styles.gradeBadge}>
                <Text style={styles.gradeText}>Grade {harvest.qualityGrade}</Text>
              </View>
            </View>
          )}

          {harvest.storageLocation && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Storage Location</Text>
              <Text style={styles.detailValue}>{harvest.storageLocation}</Text>
            </View>
          )}

          {harvest.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <Text style={styles.notesText}>{harvest.notes}</Text>
            </View>
          )}
        </Card>

        {/* Usage History */}
        {(distributions.length > 0 || extracts.length > 0) && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Usage History</Text>
            </View>

            {distributions.map((dist) => (
              <TouchableOpacity
                key={dist.id}
                style={styles.historyItem}
                onPress={() => router.push(`/(tabs)/distributions/${dist.id}`)}
              >
                <View style={[styles.historyIcon, { backgroundColor: '#F3E5F5' }]}>
                  <Ionicons name="gift" size={18} color="#7B1FA2" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>Distributed to {dist.patientName}</Text>
                  <Text style={styles.historyMeta}>
                    {dist.quantityGrams}g • {format(new Date(dist.distributionDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            ))}

            {extracts.map((ext) => (
              <TouchableOpacity
                key={ext.id}
                style={styles.historyItem}
                onPress={() => router.push(`/(tabs)/extracts/${ext.id}`)}
              >
                <View style={[styles.historyIcon, { backgroundColor: '#FFF3E0' }]}>
                  <Ionicons name="flask" size={18} color="#FF5722" />
                </View>
                <View style={styles.historyContent}>
                  <Text style={styles.historyTitle}>{ext.name}</Text>
                  <Text style={styles.historyMeta}>
                    {ext.inputWeightGrams}g used • {format(new Date(ext.extractionDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            ))}
          </Card>
        )}

        {/* View History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setAuditHistoryVisible(true)}
        >
          <Ionicons name="time-outline" size={20} color="#607D8B" />
          <Text style={styles.historyButtonText}>View Change History</Text>
        </TouchableOpacity>

        {/* Delete Button */}
        <Button title="Delete Harvest" onPress={handleDelete} variant="danger" />
      </ScrollView>

      {/* Audit History Modal */}
      <AuditHistoryModal
        visible={auditHistoryVisible}
        onClose={() => setAuditHistoryVisible(false)}
        entityType="harvest"
        entityId={id as string}
        entityDisplayName={harvest?.controlNumber}
      />

      {/* Weight Update Modal */}
      <Modal
        visible={weightModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWeightModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Update {weightType === 'dry' ? 'Dry' : 'Final'} Weight
            </Text>

            <View style={styles.currentWeightInfo}>
              <Text style={styles.currentWeightLabel}>Current Wet Weight:</Text>
              <Text style={styles.currentWeightValue}>{harvest.wetWeightGrams}g</Text>
            </View>

            <Input
              label={`${weightType === 'dry' ? 'Dry' : 'Final'} Weight (grams) *`}
              value={newWeight}
              onChangeText={setNewWeight}
              placeholder="Enter weight"
              keyboardType="decimal-pad"
            />

            {newWeight && (
              <View style={styles.lossPreview}>
                <Text style={styles.lossPreviewLabel}>Weight Loss:</Text>
                <Text style={styles.lossPreviewValue}>
                  {((harvest.wetWeightGrams - parseFloat(newWeight || '0')) / harvest.wetWeightGrams * 100).toFixed(1)}%
                </Text>
              </View>
            )}

            {weightType === 'final' && (
              <Input
                label="Trim/Waste Weight (grams)"
                value={trimWeight}
                onChangeText={setTrimWeight}
                placeholder="Optional"
                keyboardType="decimal-pad"
              />
            )}

            <View style={styles.modalButtons}>
              <Button
                title={updatingWeight ? 'Updating...' : 'Update Weight'}
                onPress={handleUpdateWeight}
                disabled={updatingWeight}
              />
              <Button
                title="Cancel"
                onPress={() => setWeightModalVisible(false)}
                variant="secondary"
                disabled={updatingWeight}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Status Update Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update Status</Text>
            <ScrollView>
              {(Object.keys(HARVEST_STATUS_INFO) as HarvestStatus[]).map((status) => {
                const info = HARVEST_STATUS_INFO[status];
                return (
                  <TouchableOpacity
                    key={status}
                    style={styles.statusOption}
                    onPress={() => handleUpdateStatus(status)}
                  >
                    <View style={[styles.statusOptionIcon, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name={info.icon} size={24} color={info.color} />
                    </View>
                    <View style={styles.statusOptionContent}>
                      <Text style={styles.statusOptionLabel}>{info.label}</Text>
                      <Text style={styles.statusOptionDescription}>{info.description}</Text>
                    </View>
                    {harvest.status === status && (
                      <Ionicons name="checkmark-circle" size={24} color={info.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button
              title="Cancel"
              onPress={() => setStatusModalVisible(false)}
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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  controlNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  statusDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  // Plant
  plantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plantIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  plantIconDeleted: {
    backgroundColor: '#f0f0f0',
  },
  plantInfo: {
    flex: 1,
  },
  plantLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  plantLabel: {
    fontSize: 12,
    color: '#999',
  },
  deletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#9E9E9E',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  deletedBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  plantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  plantNameDeleted: {
    color: '#999',
  },
  plantStrain: {
    fontSize: 13,
    color: '#666',
  },
  // Section
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
  // Weight Tracker
  weightTracker: {
    paddingLeft: 8,
  },
  weightStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weightStepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  weightStepComplete: {
    backgroundColor: '#4CAF50',
  },
  weightStepPending: {
    backgroundColor: '#e0e0e0',
  },
  weightStepContent: {
    flex: 1,
    paddingTop: 8,
  },
  weightStepLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  weightStepValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  weightLoss: {
    fontSize: 12,
    color: '#FF9800',
    marginTop: 2,
  },
  trimWeight: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  weightConnector: {
    width: 2,
    height: 20,
    backgroundColor: '#e0e0e0',
    marginLeft: 19,
  },
  addWeightButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  addWeightText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },
  weightPendingText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  // Inventory
  inventoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  inventoryItem: {
    width: '48%',
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  inventoryTotal: {
    backgroundColor: '#E3F2FD',
  },
  inventoryAvailable: {
    backgroundColor: '#E8F5E9',
  },
  inventoryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  inventoryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  inventoryValueGreen: {
    color: '#4CAF50',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  distributeButton: {
    backgroundColor: '#F3E5F5',
  },
  extractButton: {
    backgroundColor: '#FFF3E0',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  // Details
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  gradeBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  notesSection: {
    paddingTop: 12,
  },
  notesText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
    marginTop: 8,
  },
  // History
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  historyMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    marginTop: 8,
  },
  currentWeightInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentWeightLabel: {
    fontSize: 14,
    color: '#666',
  },
  currentWeightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lossPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  lossPreviewLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  lossPreviewValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  // Status Options
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statusOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusOptionContent: {
    flex: 1,
  },
  statusOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusOptionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // History Button
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  historyButtonText: {
    fontSize: 15,
    color: '#607D8B',
    fontWeight: '500',
  },
});

