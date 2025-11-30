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
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getPatient,
  updatePatient,
  deactivatePatient,
  deletePatient,
  getPatientDistributions,
} from '../../../firebase/firestore';
import { Patient, PatientStatus, PatientDocumentType, Distribution, ProductType } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { DatePicker } from '../../../components/DatePicker';
import { Loading } from '../../../components/Loading';
import { AuditHistoryModal } from '../../../components/AuditHistoryModal';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const STATUS_COLORS: Record<PatientStatus, string> = {
  active: '#4CAF50',
  inactive: '#9E9E9E',
  pending: '#FF9800',
};

const STATUS_LABELS: Record<PatientStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
};

const DOCUMENT_TYPE_LABELS: Record<PatientDocumentType, string> = {
  cpf: 'CPF',
  rg: 'RG',
  passport: 'Passport',
  other: 'Other',
};

const DOCUMENT_TYPES: { value: PatientDocumentType; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'rg', label: 'RG' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

const PRODUCT_TYPE_LABELS: Record<ProductType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  flower: { label: 'Flower', icon: 'leaf', color: '#4CAF50' },
  extract: { label: 'Extract', icon: 'flask', color: '#FF9800' },
  oil: { label: 'Oil', icon: 'water', color: '#2196F3' },
  edible: { label: 'Edible', icon: 'nutrition', color: '#E91E63' },
  topical: { label: 'Topical', icon: 'hand-left', color: '#9C27B0' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#607D8B' },
};

// Check if prescription is valid
const getPrescriptionStatus = (patient: Patient): { status: 'valid' | 'expired' | 'none'; label: string; color: string } => {
  if (!patient.prescriptionDate) {
    return { status: 'none', label: 'No prescription', color: '#9E9E9E' };
  }
  
  if (!patient.prescriptionExpirationDate) {
    return { status: 'valid', label: 'Valid (no expiration)', color: '#4CAF50' };
  }
  
  const now = Date.now();
  if (patient.prescriptionExpirationDate < now) {
    return { status: 'expired', label: 'Expired', color: '#f44336' };
  }
  
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (patient.prescriptionExpirationDate - now < thirtyDays) {
    const daysLeft = Math.ceil((patient.prescriptionExpirationDate - now) / (24 * 60 * 60 * 1000));
    return { status: 'valid', label: `Expiring in ${daysLeft} days`, color: '#FF9800' };
  }
  
  return { status: 'valid', label: 'Valid', color: '#4CAF50' };
};

export default function PatientDetailScreen() {
  const { id } = useLocalSearchParams();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [distributions, setDistributions] = useState<Distribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [auditHistoryVisible, setAuditHistoryVisible] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editDocumentType, setEditDocumentType] = useState<PatientDocumentType>('cpf');
  const [editDocumentNumber, setEditDocumentNumber] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editMedicalCondition, setEditMedicalCondition] = useState('');
  const [editPrescribingDoctor, setEditPrescribingDoctor] = useState('');
  const [editDoctorCrm, setEditDoctorCrm] = useState('');
  const [editNotes, setEditNotes] = useState('');
  // Prescription & Consent fields (previously missing from edit)
  const [editPrescriptionDate, setEditPrescriptionDate] = useState<Date | null>(null);
  const [editPrescriptionExpiration, setEditPrescriptionExpiration] = useState<Date | null>(null);
  const [editPrescriptionFileUrl, setEditPrescriptionFileUrl] = useState('');
  const [editConsentDate, setEditConsentDate] = useState<Date | null>(null);
  const [editConsentFileUrl, setEditConsentFileUrl] = useState('');
  // Allowance fields
  const [editAllowanceOilGrams, setEditAllowanceOilGrams] = useState('');
  const [editAllowanceExtractGrams, setEditAllowanceExtractGrams] = useState('');
  const [editAllowanceFlowerThcGrams, setEditAllowanceFlowerThcGrams] = useState('');
  const [editAllowanceFlowerCbdGrams, setEditAllowanceFlowerCbdGrams] = useState('');

  const { userData } = useAuth();
  const router = useRouter();

  const loadPatient = async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    try {
      const [patientData, distributionsData] = await Promise.all([
        getPatient(id),
        getPatientDistributions(id),
      ]);
      setPatient(patientData);
      setDistributions(distributionsData);
    } catch (error: any) {
      console.error('[PatientDetail] Error loading patient:', error);
      Alert.alert('Error', 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadPatient();
    }, [id])
  );

  const handleEditPress = () => {
    if (!patient) return;
    
    setEditName(patient.name);
    setEditDocumentType(patient.documentType);
    setEditDocumentNumber(patient.documentNumber);
    setEditEmail(patient.email || '');
    setEditPhone(patient.phone || '');
    setEditAddress(patient.address || '');
    setEditMedicalCondition(patient.medicalCondition || '');
    setEditPrescribingDoctor(patient.prescribingDoctor || '');
    setEditDoctorCrm(patient.doctorCrm || '');
    setEditNotes(patient.notes || '');
    // Initialize prescription & consent fields
    setEditPrescriptionDate(patient.prescriptionDate ? new Date(patient.prescriptionDate) : null);
    setEditPrescriptionExpiration(patient.prescriptionExpirationDate ? new Date(patient.prescriptionExpirationDate) : null);
    setEditPrescriptionFileUrl(patient.prescriptionFileUrl || '');
    setEditConsentDate(patient.consentSignedDate ? new Date(patient.consentSignedDate) : null);
    setEditConsentFileUrl(patient.consentFileUrl || '');
    // Initialize allowance fields
    setEditAllowanceOilGrams(patient.allowanceOilGrams?.toString() || '');
    setEditAllowanceExtractGrams(patient.allowanceExtractGrams?.toString() || '');
    setEditAllowanceFlowerThcGrams(patient.allowanceFlowerThcGrams?.toString() || '');
    setEditAllowanceFlowerCbdGrams(patient.allowanceFlowerCbdGrams?.toString() || '');
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!patient || !id || typeof id !== 'string') return;

    if (!editName.trim() || !editDocumentNumber.trim()) {
      Alert.alert('Error', 'Name and document number are required');
      return;
    }

    try {
      await updatePatient(id, {
        name: editName.trim(),
        documentType: editDocumentType,
        documentNumber: editDocumentNumber.trim(),
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        medicalCondition: editMedicalCondition.trim() || undefined,
        prescribingDoctor: editPrescribingDoctor.trim() || undefined,
        doctorCrm: editDoctorCrm.trim() || undefined,
        notes: editNotes.trim() || undefined,
        // Prescription & Consent fields
        prescriptionDate: editPrescriptionDate?.getTime() || undefined,
        prescriptionExpirationDate: editPrescriptionExpiration?.getTime() || undefined,
        prescriptionFileUrl: editPrescriptionFileUrl.trim() || undefined,
        consentSignedDate: editConsentDate?.getTime() || undefined,
        consentFileUrl: editConsentFileUrl.trim() || undefined,
        // Allowance fields
        allowanceOilGrams: editAllowanceOilGrams ? parseFloat(editAllowanceOilGrams) : undefined,
        allowanceExtractGrams: editAllowanceExtractGrams ? parseFloat(editAllowanceExtractGrams) : undefined,
        allowanceFlowerThcGrams: editAllowanceFlowerThcGrams ? parseFloat(editAllowanceFlowerThcGrams) : undefined,
        allowanceFlowerCbdGrams: editAllowanceFlowerCbdGrams ? parseFloat(editAllowanceFlowerCbdGrams) : undefined,
      });

      setEditModalVisible(false);
      loadPatient();
      Alert.alert('Success', 'Patient updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update patient: ' + (error.message || 'Unknown error'));
    }
  };

  const handleStatusChange = async (newStatus: PatientStatus) => {
    if (!patient || !id || typeof id !== 'string') return;

    try {
      await updatePatient(id, { status: newStatus });
      setStatusModalVisible(false);
      loadPatient();
      Alert.alert('Success', `Patient status changed to ${STATUS_LABELS[newStatus]}`);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Patient',
      'Are you sure you want to deactivate this patient? They will no longer appear in active lists.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deactivatePatient(id);
              loadPatient();
              Alert.alert('Done', 'Patient deactivated');
            } catch (error) {
              Alert.alert('Error', 'Failed to deactivate patient');
            }
          },
        },
      ]
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Patient',
      'Are you sure you want to permanently delete this patient? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deletePatient(id);
              Alert.alert('Done', 'Patient deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete patient');
            }
          },
        },
      ]
    );
  };

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open URL');
    });
  };

  if (loading) {
    return <Loading message="Loading patient..." />;
  }

  if (!patient) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Patient not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const prescriptionStatus = getPrescriptionStatus(patient);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Patient Header */}
        <Card>
          <View style={styles.patientHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={32} color="#fff" />
            </View>
            <View style={styles.patientInfo}>
              <Text style={styles.patientName}>{patient.name}</Text>
              <Text style={styles.patientDocument}>
                {DOCUMENT_TYPE_LABELS[patient.documentType]}: {patient.documentNumber}
              </Text>
            </View>
            <TouchableOpacity onPress={handleEditPress} style={styles.editButton}>
              <Ionicons name="pencil" size={24} color="#0288D1" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.statusRow}
            onPress={() => setStatusModalVisible(true)}
          >
            <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[patient.status] }]}>
              <Text style={styles.statusText}>{STATUS_LABELS[patient.status]}</Text>
            </View>
            <Text style={styles.statusChangeHint}>Tap to change status</Text>
            <Ionicons name="chevron-forward" size={16} color="#999" />
          </TouchableOpacity>
        </Card>

        {/* Contact Information */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="call" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Contact Information</Text>
          </View>

          {patient.email && (
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{patient.email}</Text>
            </View>
          )}

          {patient.phone && (
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{patient.phone}</Text>
            </View>
          )}

          {patient.address && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={18} color="#666" />
              <Text style={styles.infoText}>{patient.address}</Text>
            </View>
          )}

          {!patient.email && !patient.phone && !patient.address && (
            <Text style={styles.emptyText}>No contact information provided</Text>
          )}
        </Card>

        {/* Medical Information */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="medical" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Medical Information</Text>
          </View>

          {patient.medicalCondition && (
            <View style={styles.infoRow}>
              <Ionicons name="fitness-outline" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Condition</Text>
                <Text style={styles.infoText}>{patient.medicalCondition}</Text>
              </View>
            </View>
          )}

          {patient.prescribingDoctor && (
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Prescribing Doctor</Text>
                <Text style={styles.infoText}>{patient.prescribingDoctor}</Text>
                {patient.doctorCrm && (
                  <Text style={styles.infoSubtext}>CRM: {patient.doctorCrm}</Text>
                )}
              </View>
            </View>
          )}

          {!patient.medicalCondition && !patient.prescribingDoctor && (
            <Text style={styles.emptyText}>No medical information provided</Text>
          )}
        </Card>

        {/* Prescription */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="document-text" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Prescription</Text>
            <View style={[styles.prescriptionBadge, { backgroundColor: prescriptionStatus.color }]}>
              <Text style={styles.prescriptionBadgeText}>{prescriptionStatus.label}</Text>
            </View>
          </View>

          {patient.prescriptionDate && (
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Prescription Date</Text>
                <Text style={styles.infoText}>
                  {format(new Date(patient.prescriptionDate), 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>
          )}

          {patient.prescriptionExpirationDate && (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color={prescriptionStatus.color} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Expiration Date</Text>
                <Text style={[styles.infoText, { color: prescriptionStatus.color }]}>
                  {format(new Date(patient.prescriptionExpirationDate), 'MMM dd, yyyy')}
                </Text>
              </View>
            </View>
          )}

          {patient.prescriptionFileUrl && (
            <TouchableOpacity
              style={styles.fileLink}
              onPress={() => openUrl(patient.prescriptionFileUrl!)}
            >
              <Ionicons name="document-attach-outline" size={18} color="#0288D1" />
              <Text style={styles.fileLinkText}>View Prescription Document</Text>
              <Ionicons name="open-outline" size={16} color="#0288D1" />
            </TouchableOpacity>
          )}

          {!patient.prescriptionDate && (
            <Text style={styles.emptyText}>No prescription on file</Text>
          )}
        </Card>

        {/* Consent */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Consent</Text>
          </View>

          {patient.consentSignedDate ? (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="create-outline" size={18} color="#4CAF50" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Consent Signed</Text>
                  <Text style={styles.infoText}>
                    {format(new Date(patient.consentSignedDate), 'MMM dd, yyyy')}
                  </Text>
                </View>
              </View>

              {patient.consentFileUrl && (
                <TouchableOpacity
                  style={styles.fileLink}
                  onPress={() => openUrl(patient.consentFileUrl!)}
                >
                  <Ionicons name="document-attach-outline" size={18} color="#0288D1" />
                  <Text style={styles.fileLinkText}>View Consent Document</Text>
                  <Ionicons name="open-outline" size={16} color="#0288D1" />
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#FF9800" />
              <Text style={styles.warningText}>Consent not signed</Text>
            </View>
          )}
        </Card>

        {/* Prescription Allowances */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="fitness" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Prescription Allowances (g/month)</Text>
          </View>

          <View style={styles.allowanceGrid}>
            <View style={styles.allowanceItem}>
              <Ionicons name="water" size={20} color="#2196F3" />
              <Text style={styles.allowanceValue}>
                {patient.allowanceOilGrams || 0}g
              </Text>
              <Text style={styles.allowanceLabel}>Oil</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Ionicons name="flask" size={20} color="#FF9800" />
              <Text style={styles.allowanceValue}>
                {patient.allowanceExtractGrams || 0}g
              </Text>
              <Text style={styles.allowanceLabel}>Extract</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Ionicons name="leaf" size={20} color="#4CAF50" />
              <Text style={styles.allowanceValue}>
                {patient.allowanceFlowerThcGrams || 0}g
              </Text>
              <Text style={styles.allowanceLabel}>THC Flower</Text>
            </View>
            <View style={styles.allowanceItem}>
              <Ionicons name="leaf-outline" size={20} color="#8BC34A" />
              <Text style={styles.allowanceValue}>
                {patient.allowanceFlowerCbdGrams || 0}g
              </Text>
              <Text style={styles.allowanceLabel}>CBD Flower</Text>
            </View>
          </View>
        </Card>

        {/* Notes */}
        {patient.notes && (
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Notes</Text>
            </View>
            <Text style={styles.notesText}>{patient.notes}</Text>
          </Card>
        )}

        {/* Distribution History */}
        <Card>
          <View style={styles.sectionHeader}>
            <Ionicons name="gift" size={20} color="#0288D1" />
            <Text style={styles.sectionTitle}>Distribution History ({distributions.length})</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {distributions.reduce((sum, d) => sum + (d.quantityGrams || 0), 0)}g
              </Text>
              <Text style={styles.statLabel}>Total Received</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>
                {distributions.length > 0
                  ? format(new Date(distributions[0].distributionDate), 'MMM dd')
                  : '-'}
              </Text>
              <Text style={styles.statLabel}>Last Distribution</Text>
            </View>
          </View>

          {distributions.length > 0 ? (
            distributions.slice(0, 5).map((dist) => {
              const productInfo = PRODUCT_TYPE_LABELS[dist.productType];
              return (
                <TouchableOpacity
                  key={dist.id}
                  style={styles.distributionItem}
                  onPress={() => router.push(`/(tabs)/distributions/${dist.id}`)}
                >
                  <View style={[styles.distributionIcon, { backgroundColor: productInfo.color + '20' }]}>
                    <Ionicons name={productInfo.icon} size={18} color={productInfo.color} />
                  </View>
                  <View style={styles.distributionInfo}>
                    <Text style={styles.distributionNumber}>#{dist.distributionNumber}</Text>
                    <Text style={styles.distributionDate}>
                      {format(new Date(dist.distributionDate), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                  <Text style={styles.distributionQuantity}>
                    {dist.quantityGrams ? `${dist.quantityGrams}g` : 
                     dist.quantityMl ? `${dist.quantityMl}ml` : 
                     dist.quantityUnits ? `${dist.quantityUnits} units` : ''}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </TouchableOpacity>
              );
            })
          ) : (
            <Text style={styles.emptyText}>No distributions recorded yet</Text>
          )}

          {distributions.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllLink}
              onPress={() => router.push('/(tabs)/distributions')}
            >
              <Text style={styles.viewAllText}>View all {distributions.length} distributions</Text>
              <Ionicons name="arrow-forward" size={16} color="#0288D1" />
            </TouchableOpacity>
          )}
        </Card>

        {/* Metadata */}
        <Card>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Joined:</Text>
            <Text style={styles.metadataValue}>
              {format(new Date(patient.joinDate), 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Last Updated:</Text>
            <Text style={styles.metadataValue}>
              {format(new Date(patient.updatedAt), 'MMM dd, yyyy HH:mm')}
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

        {/* Action Buttons */}
        {patient.status !== 'inactive' && (
          <Button
            title="Deactivate Patient"
            onPress={handleDeactivate}
            variant="secondary"
          />
        )}

        <Button
          title="Delete Patient"
          onPress={handleDelete}
          variant="danger"
        />
      </ScrollView>

      {/* Audit History Modal */}
      <AuditHistoryModal
        visible={auditHistoryVisible}
        onClose={() => setAuditHistoryVisible(false)}
        entityType="patient"
        entityId={id as string}
        entityDisplayName={patient?.name}
      />

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Patient</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Full Name *"
                value={editName}
                onChangeText={setEditName}
                placeholder="Patient's full name"
              />

              <Text style={styles.inputLabel}>Document Type</Text>
              <View style={styles.documentTypeContainer}>
                {DOCUMENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.documentTypeButton,
                      editDocumentType === type.value && styles.documentTypeButtonActive,
                    ]}
                    onPress={() => setEditDocumentType(type.value)}
                  >
                    <Text
                      style={[
                        styles.documentTypeText,
                        editDocumentType === type.value && styles.documentTypeTextActive,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Input
                label="Document Number *"
                value={editDocumentNumber}
                onChangeText={setEditDocumentNumber}
              />

              <Input
                label="Email"
                value={editEmail}
                onChangeText={setEditEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Input
                label="Phone"
                value={editPhone}
                onChangeText={setEditPhone}
                keyboardType="phone-pad"
              />

              <Input
                label="Address"
                value={editAddress}
                onChangeText={setEditAddress}
                multiline
              />

              <Input
                label="Medical Condition"
                value={editMedicalCondition}
                onChangeText={setEditMedicalCondition}
                multiline
              />

              <Input
                label="Prescribing Doctor"
                value={editPrescribingDoctor}
                onChangeText={setEditPrescribingDoctor}
              />

              <Input
                label="Doctor CRM"
                value={editDoctorCrm}
                onChangeText={setEditDoctorCrm}
              />

              {/* Prescription Section */}
              <View style={styles.editSectionHeader}>
                <Ionicons name="document-text" size={18} color="#0288D1" />
                <Text style={styles.editSectionTitle}>Prescription</Text>
              </View>

              <DatePicker
                label="Prescription Date"
                value={editPrescriptionDate}
                onChange={setEditPrescriptionDate}
                placeholder="Select prescription date"
                maximumDate={new Date()}
              />

              <DatePicker
                label="Expiration Date"
                value={editPrescriptionExpiration}
                onChange={setEditPrescriptionExpiration}
                placeholder="Select expiration date"
                minimumDate={editPrescriptionDate || undefined}
              />

              <Input
                label="Prescription File URL"
                value={editPrescriptionFileUrl}
                onChangeText={setEditPrescriptionFileUrl}
                placeholder="https://..."
                autoCapitalize="none"
              />

              {/* Consent Section */}
              <View style={styles.editSectionHeader}>
                <Ionicons name="checkmark-circle" size={18} color="#0288D1" />
                <Text style={styles.editSectionTitle}>Consent</Text>
              </View>

              <DatePicker
                label="Consent Signed Date"
                value={editConsentDate}
                onChange={setEditConsentDate}
                placeholder="Select consent date"
                maximumDate={new Date()}
              />

              <Input
                label="Consent File URL"
                value={editConsentFileUrl}
                onChangeText={setEditConsentFileUrl}
                placeholder="https://..."
                autoCapitalize="none"
              />

              {/* Allowances Section */}
              <View style={styles.editSectionHeader}>
                <Ionicons name="fitness" size={18} color="#0288D1" />
                <Text style={styles.editSectionTitle}>Prescription Allowances (g/month)</Text>
              </View>

              <View style={styles.allowanceRow}>
                <View style={styles.allowanceInput}>
                  <Input
                    label="Oil (g)"
                    value={editAllowanceOilGrams}
                    onChangeText={setEditAllowanceOilGrams}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.allowanceInput}>
                  <Input
                    label="Extract (g)"
                    value={editAllowanceExtractGrams}
                    onChangeText={setEditAllowanceExtractGrams}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.allowanceRow}>
                <View style={styles.allowanceInput}>
                  <Input
                    label="THC Flower (g)"
                    value={editAllowanceFlowerThcGrams}
                    onChangeText={setEditAllowanceFlowerThcGrams}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.allowanceInput}>
                  <Input
                    label="CBD Flower (g)"
                    value={editAllowanceFlowerCbdGrams}
                    onChangeText={setEditAllowanceFlowerCbdGrams}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <Input
                label="Notes"
                value={editNotes}
                onChangeText={setEditNotes}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Save Changes" onPress={handleEditSave} style={styles.saveButton} />
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        visible={statusModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Status</Text>
            
            {(['active', 'pending', 'inactive'] as PatientStatus[]).map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.statusOption}
                onPress={() => handleStatusChange(status)}
              >
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={styles.statusOptionText}>{STATUS_LABELS[status]}</Text>
                {patient.status === status && (
                  <Ionicons name="checkmark" size={24} color="#0288D1" />
                )}
              </TouchableOpacity>
            ))}

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
  patientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0288D1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  patientDocument: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  editButton: {
    padding: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  statusChangeHint: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    marginLeft: 12,
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
    flex: 1,
  },
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
  infoSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Prescription
  prescriptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  prescriptionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  fileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  fileLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#0288D1',
    fontWeight: '500',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '500',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0288D1',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
    maxHeight: '85%',
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
    backgroundColor: '#0288D1',
  },
  editSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  editSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0288D1',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
    color: '#333',
  },
  documentTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  documentTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentTypeButtonActive: {
    backgroundColor: '#0288D1',
    borderColor: '#0288D1',
  },
  documentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  documentTypeTextActive: {
    color: '#fff',
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  statusOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  // Distribution items
  distributionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  distributionIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  distributionInfo: {
    flex: 1,
  },
  distributionNumber: {
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
    color: '#0288D1',
    marginRight: 8,
  },
  viewAllLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  viewAllText: {
    fontSize: 14,
    color: '#0288D1',
    fontWeight: '500',
  },
  // Allowance styles
  allowanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  allowanceItem: {
    width: '47%',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  allowanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  allowanceLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  allowanceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  allowanceInput: {
    flex: 1,
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

