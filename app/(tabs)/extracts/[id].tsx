import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getExtract,
  updateExtract,
  deleteExtract,
  getHarvest,
  getPatientDistributions,
  getUserDistributions,
} from '../../../firebase/firestore';
import { Extract, ExtractType, ExtractionMethod, Harvest, Distribution } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Loading } from '../../../components/Loading';
import { AuditHistoryModal } from '../../../components/AuditHistoryModal';
import { format, differenceInDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const EXTRACT_TYPE_LABELS: Record<ExtractType, { label: string; color: string }> = {
  oil: { label: 'Oil', color: '#FF9800' },
  tincture: { label: 'Tincture', color: '#4CAF50' },
  concentrate: { label: 'Concentrate', color: '#9C27B0' },
  isolate: { label: 'Isolate', color: '#2196F3' },
  full_spectrum: { label: 'Full Spectrum', color: '#E91E63' },
  broad_spectrum: { label: 'Broad Spectrum', color: '#00BCD4' },
  other: { label: 'Other', color: '#607D8B' },
};

const EXTRACTION_METHOD_LABELS: Record<ExtractionMethod, string> = {
  co2: 'CO₂ Extraction',
  ethanol: 'Ethanol',
  butane: 'Butane (BHO)',
  rosin: 'Rosin Press',
  ice_water: 'Ice Water Hash',
  olive_oil: 'Olive Oil',
  other: 'Other',
};

export default function ExtractDetailScreen() {
  const { id } = useLocalSearchParams();
  const [extract, setExtract] = useState<Extract | null>(null);
  const [sourceHarvests, setSourceHarvests] = useState<Harvest[]>([]);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [auditHistoryVisible, setAuditHistoryVisible] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editStorageLocation, setEditStorageLocation] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    try {
      const extractData = await getExtract(id);
      setExtract(extractData);

      if (extractData) {
        // Load source harvests
        const harvestPromises = extractData.harvestIds.map(hId => getHarvest(hId));
        const harvests = await Promise.all(harvestPromises);
        setSourceHarvests(harvests.filter((h): h is Harvest => h !== null));

        // Load distributions for this extract
        if (userData) {
          const allDistributions = await getUserDistributions(userData.uid);
          const extractDistributions = allDistributions.filter(d => d.extractId === id);
          setDistributions(extractDistributions);
        }
      }
    } catch (error: any) {
      console.error('[ExtractDetail] Error loading data:', error);
      Alert.alert('Error', 'Failed to load extract details');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id, userData])
  );

  const openEditModal = () => {
    if (extract) {
      setEditName(extract.name);
      setEditStorageLocation(extract.storageLocation || '');
      setEditNotes(extract.notes || '');
      setEditModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!extract) return;

    try {
      await updateExtract(extract.id, {
        name: editName.trim(),
        storageLocation: editStorageLocation.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      setExtract({
        ...extract,
        name: editName.trim(),
        storageLocation: editStorageLocation.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      setEditModalVisible(false);
      Alert.alert('Success', 'Extract updated successfully');
    } catch (error: any) {
      console.error('[ExtractDetail] Error updating extract:', error);
      Alert.alert('Error', 'Failed to update extract');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Extract',
      'Are you sure you want to delete this extract? This will also update the source harvests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExtract(id as string);
              Alert.alert('Success', 'Extract deleted successfully', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error: any) {
              console.error('[ExtractDetail] Error deleting extract:', error);
              Alert.alert('Error', 'Failed to delete extract');
            }
          },
        },
      ]
    );
  };

  const handleDistribute = () => {
    router.push({
      pathname: '/(tabs)/distributions/new',
      params: { extractId: id },
    });
  };

  const getExpirationStatus = (): { label: string; color: string } | null => {
    if (!extract?.expirationDate) return null;

    const daysUntilExpiration = differenceInDays(new Date(extract.expirationDate), new Date());

    if (daysUntilExpiration < 0) {
      return { label: 'EXPIRED', color: '#f44336' };
    } else if (daysUntilExpiration <= 30) {
      return { label: `Expires in ${daysUntilExpiration} days`, color: '#FF9800' };
    } else if (daysUntilExpiration <= 90) {
      return { label: `Expires in ${daysUntilExpiration} days`, color: '#FFC107' };
    }
    return { label: format(new Date(extract.expirationDate), 'MMM dd, yyyy'), color: '#4CAF50' };
  };

  if (loading) {
    return <Loading message="Loading extract..." />;
  }

  if (!extract) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Extract not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = EXTRACT_TYPE_LABELS[extract.extractType];
  const expirationStatus = getExpirationStatus();
  const totalDistributed = distributions.reduce((sum, d) => sum + (d.quantityMl || 0), 0);
  const remainingVolume = (extract.outputVolumeMl || 0) - totalDistributed;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Card>
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name="flask" size={32} color={typeInfo.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.controlNumber}>#{extract.controlNumber}</Text>
              <Text style={styles.name}>{extract.name}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
              </View>
            </View>
          </View>

          {expirationStatus && (
            <View style={[styles.expirationBanner, { backgroundColor: expirationStatus.color + '15' }]}>
              <Ionicons name="time-outline" size={18} color={expirationStatus.color} />
              <Text style={[styles.expirationText, { color: expirationStatus.color }]}>
                {expirationStatus.label}
              </Text>
            </View>
          )}
        </Card>

        {/* Quantity & Concentration */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="beaker" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>Output & Concentration</Text>
          </View>

          <View style={styles.statsGrid}>
            {extract.outputVolumeMl && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{extract.outputVolumeMl}ml</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
            )}
            {extract.outputWeightGrams && (
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{extract.outputWeightGrams}g</Text>
                <Text style={styles.statLabel}>Weight</Text>
              </View>
            )}
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{extract.inputWeightGrams}g</Text>
              <Text style={styles.statLabel}>Input Material</Text>
            </View>
          </View>

          {(extract.thcMgPerMl || extract.cbdMgPerMl) && (
            <View style={styles.concentrationRow}>
              {extract.thcMgPerMl && (
                <View style={styles.concentrationBox}>
                  <Text style={styles.concentrationLabel}>THC</Text>
                  <Text style={styles.concentrationValue}>{extract.thcMgPerMl} mg/ml</Text>
                </View>
              )}
              {extract.cbdMgPerMl && (
                <View style={[styles.concentrationBox, styles.cbdBox]}>
                  <Text style={styles.concentrationLabel}>CBD</Text>
                  <Text style={styles.concentrationValue}>{extract.cbdMgPerMl} mg/ml</Text>
                </View>
              )}
            </View>
          )}

          {extract.carrier && (
            <View style={styles.infoRow}>
              <Ionicons name="water-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Carrier:</Text>
              <Text style={styles.infoValue}>{extract.carrier}</Text>
            </View>
          )}
        </Card>

        {/* Extraction Info */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="construct" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>Extraction Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {format(new Date(extract.extractionDate), 'MMMM dd, yyyy')}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="flask-outline" size={18} color="#666" />
            <Text style={styles.infoLabel}>Method:</Text>
            <Text style={styles.infoValue}>
              {EXTRACTION_METHOD_LABELS[extract.extractionMethod]}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="barcode-outline" size={18} color="#666" />
            <Text style={styles.infoLabel}>Batch:</Text>
            <Text style={styles.infoValue}>{extract.batchNumber}</Text>
          </View>

          {extract.storageLocation && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Storage:</Text>
              <Text style={styles.infoValue}>{extract.storageLocation}</Text>
            </View>
          )}
        </Card>

        {/* Source Harvests */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="leaf" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>Source Harvests ({sourceHarvests.length})</Text>
          </View>

          {sourceHarvests.map((harvest) => (
            <TouchableOpacity
              key={harvest.id}
              style={styles.harvestItem}
              onPress={() => router.push(`/(tabs)/logs/harvest?harvestId=${harvest.id}`)}
            >
              <View style={styles.harvestBadge}>
                <Text style={styles.harvestBadgeText}>#{harvest.controlNumber}</Text>
              </View>
              <View style={styles.harvestInfo}>
                <Text style={styles.harvestDate}>
                  {format(new Date(harvest.harvestDate), 'MMM dd, yyyy')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#999" />
            </TouchableOpacity>
          ))}
        </Card>

        {/* Lab Analysis Placeholder */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="analytics" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>Lab Analysis</Text>
          </View>
          <View style={styles.placeholderContent}>
            <Ionicons name="flask-outline" size={40} color="#ccc" />
            <Text style={styles.placeholderText}>Lab analysis coming in Phase 5</Text>
          </View>
        </Card>

        {/* Distribution History */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={20} color="#FF5722" />
            <Text style={styles.sectionTitle}>Distribution History ({distributions.length})</Text>
          </View>

          {extract.outputVolumeMl && (
            <View style={styles.distributionStats}>
              <View style={styles.distributionStat}>
                <Text style={styles.distributionStatValue}>{totalDistributed}ml</Text>
                <Text style={styles.distributionStatLabel}>Distributed</Text>
              </View>
              <View style={styles.distributionStat}>
                <Text style={[styles.distributionStatValue, { color: remainingVolume > 0 ? '#4CAF50' : '#f44336' }]}>
                  {remainingVolume}ml
                </Text>
                <Text style={styles.distributionStatLabel}>Remaining</Text>
              </View>
            </View>
          )}

          {distributions.length > 0 ? (
            distributions.slice(0, 5).map((dist) => (
              <TouchableOpacity
                key={dist.id}
                style={styles.distributionItem}
                onPress={() => router.push(`/(tabs)/distributions/${dist.id}`)}
              >
                <View style={styles.distributionInfo}>
                  <Text style={styles.distributionPatient}>{dist.patientName}</Text>
                  <Text style={styles.distributionDate}>
                    {format(new Date(dist.distributionDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
                <Text style={styles.distributionQuantity}>
                  {dist.quantityMl ? `${dist.quantityMl}ml` : dist.quantityGrams ? `${dist.quantityGrams}g` : ''}
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#999" />
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No distributions yet</Text>
          )}
        </Card>

        {/* Notes */}
        {extract.notes && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#FF5722" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{extract.notes}</Text>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created:</Text>
            <Text style={styles.metadataValue}>
              {format(new Date(extract.createdAt), 'MMM dd, yyyy HH:mm')}
            </Text>
          </View>
        </Card>

        {/* View History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setAuditHistoryVisible(true)}
        >
          <Ionicons name="time-outline" size={20} color="#607D8B" />
          <Text style={styles.historyButtonText}>View Change History</Text>
        </TouchableOpacity>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Distribute Extract"
            onPress={handleDistribute}
            style={styles.distributeButton}
          />
          <View style={styles.actionRow}>
            <Button
              title="Edit"
              onPress={openEditModal}
              variant="secondary"
              style={styles.actionButton}
            />
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="secondary"
              style={[styles.actionButton, styles.deleteButton]}
            />
          </View>
        </View>
      </ScrollView>

      {/* Audit History Modal */}
      <AuditHistoryModal
        visible={auditHistoryVisible}
        onClose={() => setAuditHistoryVisible(false)}
        entityType="extract"
        entityId={id as string}
        entityDisplayName={extract?.controlNumber || extract?.name}
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Extract</Text>
            <ScrollView>
              <Input
                label="Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Extract name"
              />
              <Input
                label="Storage Location"
                value={editStorageLocation}
                onChangeText={setEditStorageLocation}
                placeholder="e.g., Refrigerator"
              />
              <Input
                label="Notes"
                value={editNotes}
                onChangeText={setEditNotes}
                placeholder="Notes..."
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button
                title="Save Changes"
                onPress={handleSaveEdit}
                style={styles.saveButton}
              />
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
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
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  headerInfo: {
    flex: 1,
  },
  controlNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF5722',
    fontFamily: 'monospace',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  expirationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  expirationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Sections
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
  // Stats
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#f5f5f5',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF5722',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  concentrationRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  concentrationBox: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cbdBox: {
    backgroundColor: '#E3F2FD',
  },
  concentrationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  concentrationValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    width: 80,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  // Harvests
  harvestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  harvestBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 12,
  },
  harvestBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  harvestInfo: {
    flex: 1,
  },
  harvestDate: {
    fontSize: 14,
    color: '#666',
  },
  // Placeholder
  placeholderContent: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  placeholderText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  // Distribution
  distributionStats: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  distributionStat: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  distributionStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  distributionStatLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  distributionInfo: {
    flex: 1,
  },
  distributionPatient: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  distributionDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  distributionQuantity: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5722',
    marginRight: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  // Notes
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  // Metadata
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metadataLabel: {
    fontSize: 13,
    color: '#999',
  },
  metadataValue: {
    fontSize: 13,
    color: '#666',
  },
  // Actions
  actions: {
    marginTop: 8,
    gap: 12,
  },
  distributeButton: {
    backgroundColor: '#FF5722',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  deleteButton: {
    borderColor: '#f44336',
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
  saveButton: {
    backgroundColor: '#FF5722',
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


