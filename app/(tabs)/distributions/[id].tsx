import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { getDistribution, deleteDistribution, getPatient } from '../../../firebase/firestore';
import { Distribution, ProductType, Patient } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { AuditHistoryModal } from '../../../components/AuditHistoryModal';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const PRODUCT_TYPE_LABELS: Record<ProductType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  flower: { label: 'Flower', icon: 'leaf', color: '#4CAF50' },
  extract: { label: 'Extract', icon: 'flask', color: '#FF9800' },
  oil: { label: 'Oil', icon: 'water', color: '#2196F3' },
  edible: { label: 'Edible', icon: 'nutrition', color: '#E91E63' },
  topical: { label: 'Topical', icon: 'hand-left', color: '#9C27B0' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#607D8B' },
};

export default function DistributionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [distribution, setDistribution] = useState<Distribution | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditHistoryVisible, setAuditHistoryVisible] = useState(false);
  const { userData } = useAuth();
  const router = useRouter();

  const loadData = async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    try {
      const distributionData = await getDistribution(id);
      setDistribution(distributionData);

      if (distributionData?.patientId) {
        const patientData = await getPatient(distributionData.patientId);
        setPatient(patientData);
      }
    } catch (error: any) {
      console.error('[DistributionDetail] Error loading data:', error);
      Alert.alert('Error', 'Failed to load distribution data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const handleDelete = () => {
    Alert.alert(
      'Delete Distribution',
      'Are you sure you want to delete this distribution record? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deleteDistribution(id);
              Alert.alert('Done', 'Distribution deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete distribution');
            }
          },
        },
      ]
    );
  };

  const getQuantityDisplay = (): string => {
    if (!distribution) return 'N/A';
    const parts: string[] = [];
    if (distribution.quantityGrams) parts.push(`${distribution.quantityGrams}g`);
    if (distribution.quantityMl) parts.push(`${distribution.quantityMl}ml`);
    if (distribution.quantityUnits) parts.push(`${distribution.quantityUnits} units`);
    return parts.join(' • ') || 'N/A';
  };

  if (loading) {
    return <Loading message="Loading distribution..." />;
  }

  if (!distribution) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Distribution not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const productInfo = PRODUCT_TYPE_LABELS[distribution.productType];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <Card>
          <View style={styles.header}>
            <View style={[styles.productIcon, { backgroundColor: productInfo.color + '20' }]}>
              <Ionicons name={productInfo.icon} size={32} color={productInfo.color} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.distributionNumber}>#{distribution.distributionNumber}</Text>
              <View style={[styles.productBadge, { backgroundColor: productInfo.color }]}>
                <Text style={styles.productBadgeText}>{productInfo.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.dateRow}>
            <Ionicons name="calendar" size={18} color="#666" />
            <Text style={styles.dateText}>
              {format(new Date(distribution.distributionDate), 'EEEE, MMMM dd, yyyy')}
            </Text>
          </View>

          {distribution.signatureConfirmation && (
            <View style={styles.signedBadge}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <Text style={styles.signedText}>Signature confirmed</Text>
            </View>
          )}
        </Card>

        {/* Patient Info */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={20} color="#7B1FA2" />
            <Text style={styles.sectionTitle}>Patient</Text>
          </View>

          <TouchableOpacity
            style={styles.patientCard}
            onPress={() => patient && router.push(`/(tabs)/patients/${patient.id}`)}
            disabled={!patient}
          >
            <View style={styles.patientAvatar}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{distribution.patientName}</Text>
              {patient?.medicalCondition && (
                <Text style={styles.patientCondition}>{patient.medicalCondition}</Text>
              )}
            </View>
            {patient && <Ionicons name="chevron-forward" size={20} color="#999" />}
          </TouchableOpacity>

          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={18} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Received By</Text>
              <Text style={styles.infoText}>{distribution.receivedBy}</Text>
            </View>
          </View>
        </Card>

        {/* Product Details */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="cube" size={20} color="#7B1FA2" />
            <Text style={styles.sectionTitle}>Product Details</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={18} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Description</Text>
              <Text style={styles.infoText}>{distribution.productDescription}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="barcode-outline" size={18} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Batch Number</Text>
              <Text style={styles.infoText}>{distribution.batchNumber}</Text>
            </View>
          </View>

          {distribution.harvestControlNumber && (
            <View style={styles.infoRow}>
              <Ionicons name="leaf-outline" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Source Harvest</Text>
                <Text style={styles.infoText}>{distribution.harvestControlNumber}</Text>
              </View>
            </View>
          )}
        </Card>

        {/* Quantity */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="scale" size={20} color="#7B1FA2" />
            <Text style={styles.sectionTitle}>Quantity</Text>
          </View>

          <View style={styles.quantityDisplay}>
            <Text style={styles.quantityValue}>{getQuantityDisplay()}</Text>
          </View>

          <View style={styles.quantityBreakdown}>
            {distribution.quantityGrams && (
              <View style={styles.quantityItem}>
                <Text style={styles.quantityItemValue}>{distribution.quantityGrams}</Text>
                <Text style={styles.quantityItemLabel}>grams</Text>
              </View>
            )}
            {distribution.quantityMl && (
              <View style={styles.quantityItem}>
                <Text style={styles.quantityItemValue}>{distribution.quantityMl}</Text>
                <Text style={styles.quantityItemLabel}>ml</Text>
              </View>
            )}
            {distribution.quantityUnits && (
              <View style={styles.quantityItem}>
                <Text style={styles.quantityItemValue}>{distribution.quantityUnits}</Text>
                <Text style={styles.quantityItemLabel}>units</Text>
              </View>
            )}
          </View>
        </Card>

        {/* Notes */}
        {distribution.notes && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#7B1FA2" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{distribution.notes}</Text>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Created:</Text>
            <Text style={styles.metadataValue}>
              {format(new Date(distribution.createdAt), 'MMM dd, yyyy HH:mm')}
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

        {/* Delete Button */}
        <Button
          title="Delete Distribution"
          onPress={handleDelete}
          variant="danger"
        />
      </ScrollView>

      {/* Audit History Modal */}
      <AuditHistoryModal
        visible={auditHistoryVisible}
        onClose={() => setAuditHistoryVisible(false)}
        entityType="distribution"
        entityId={id as string}
        entityDisplayName={distribution?.distributionNumber}
      />
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
  productIcon: {
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
  distributionNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#7B1FA2',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  productBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  productBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 15,
    color: '#666',
  },
  signedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
    alignSelf: 'flex-start',
  },
  signedText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
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
  // Patient
  patientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  patientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  patientCondition: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  // Info rows
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
  },
  // Quantity
  quantityDisplay: {
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  quantityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#7B1FA2',
  },
  quantityBreakdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
  },
  quantityItem: {
    alignItems: 'center',
  },
  quantityItemValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  quantityItemLabel: {
    fontSize: 12,
    color: '#666',
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
    paddingVertical: 4,
  },
  metadataLabel: {
    fontSize: 13,
    color: '#999',
  },
  metadataValue: {
    fontSize: 13,
    color: '#666',
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


