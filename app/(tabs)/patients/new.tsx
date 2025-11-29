import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { createPatient } from '../../../firebase/firestore';
import { PatientStatus, PatientDocumentType } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { Ionicons } from '@expo/vector-icons';

const DOCUMENT_TYPES: { value: PatientDocumentType; label: string }[] = [
  { value: 'cpf', label: 'CPF' },
  { value: 'rg', label: 'RG' },
  { value: 'passport', label: 'Passport' },
  { value: 'other', label: 'Other' },
];

export default function NewPatientScreen() {
  const [submitting, setSubmitting] = useState(false);

  // Personal info
  const [name, setName] = useState('');
  const [documentType, setDocumentType] = useState<PatientDocumentType>('cpf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Medical info
  const [medicalCondition, setMedicalCondition] = useState('');
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [doctorCrm, setDoctorCrm] = useState('');

  // Prescription
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [prescriptionExpiration, setPrescriptionExpiration] = useState('');
  const [prescriptionFileUrl, setPrescriptionFileUrl] = useState('');

  // Consent
  const [consentDate, setConsentDate] = useState('');
  const [consentFileUrl, setConsentFileUrl] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  const { userData } = useAuth();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!userData) return;

    // Validation
    if (!name.trim()) {
      Alert.alert('Error', 'Patient name is required');
      return;
    }

    if (!documentNumber.trim()) {
      Alert.alert('Error', 'Document number is required');
      return;
    }

    setSubmitting(true);

    try {
      const now = Date.now();

      // Parse dates
      let prescriptionDateNum: number | undefined;
      let prescriptionExpirationNum: number | undefined;
      let consentDateNum: number | undefined;

      if (prescriptionDate.trim()) {
        const parsed = new Date(prescriptionDate);
        if (!isNaN(parsed.getTime())) {
          prescriptionDateNum = parsed.getTime();
        }
      }

      if (prescriptionExpiration.trim()) {
        const parsed = new Date(prescriptionExpiration);
        if (!isNaN(parsed.getTime())) {
          prescriptionExpirationNum = parsed.getTime();
        }
      }

      if (consentDate.trim()) {
        const parsed = new Date(consentDate);
        if (!isNaN(parsed.getTime())) {
          consentDateNum = parsed.getTime();
        }
      }

      await createPatient({
        userId: userData.uid,
        name: name.trim(),
        documentType,
        documentNumber: documentNumber.trim(),
        ...(email.trim() && { email: email.trim() }),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(address.trim() && { address: address.trim() }),
        joinDate: now,
        status: 'pending' as PatientStatus,
        ...(medicalCondition.trim() && { medicalCondition: medicalCondition.trim() }),
        ...(prescribingDoctor.trim() && { prescribingDoctor: prescribingDoctor.trim() }),
        ...(doctorCrm.trim() && { doctorCrm: doctorCrm.trim() }),
        ...(prescriptionDateNum && { prescriptionDate: prescriptionDateNum }),
        ...(prescriptionExpirationNum && { prescriptionExpirationDate: prescriptionExpirationNum }),
        ...(prescriptionFileUrl.trim() && { prescriptionFileUrl: prescriptionFileUrl.trim() }),
        ...(consentDateNum && { consentSignedDate: consentDateNum }),
        ...(consentFileUrl.trim() && { consentFileUrl: consentFileUrl.trim() }),
        ...(notes.trim() && { notes: notes.trim() }),
        createdAt: now,
        updatedAt: now,
      });

      Alert.alert('Success', 'Patient registered successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewPatient] Error creating patient:', error);
      Alert.alert('Error', 'Failed to register patient: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Privacy Notice */}
          <View style={styles.privacyNotice}>
            <Ionicons name="shield-checkmark" size={24} color="#0288D1" />
            <View style={styles.privacyContent}>
              <Text style={styles.privacyTitle}>Data Protection Notice</Text>
              <Text style={styles.privacyText}>
                Patient data is encrypted and stored securely. Only you have access to this information.
                We comply with LGPD and healthcare data protection regulations.
              </Text>
            </View>
          </View>

          {/* Personal Information */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <Input
              label="Full Name *"
              value={name}
              onChangeText={setName}
              placeholder="Patient's full name"
            />

            <Text style={styles.inputLabel}>Document Type *</Text>
            <View style={styles.documentTypeContainer}>
              {DOCUMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.documentTypeButton,
                    documentType === type.value && styles.documentTypeButtonActive,
                  ]}
                  onPress={() => setDocumentType(type.value)}
                >
                  <Text
                    style={[
                      styles.documentTypeText,
                      documentType === type.value && styles.documentTypeTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Input
              label="Document Number *"
              value={documentNumber}
              onChangeText={setDocumentNumber}
              placeholder="Enter document number"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="patient@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Phone"
              value={phone}
              onChangeText={setPhone}
              placeholder="(XX) XXXXX-XXXX"
              keyboardType="phone-pad"
            />

            <Input
              label="Address"
              value={address}
              onChangeText={setAddress}
              placeholder="Full address"
              multiline
              numberOfLines={2}
            />
          </Card>

          {/* Medical Information */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="medical" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Medical Information</Text>
            </View>

            <Input
              label="Medical Condition"
              value={medicalCondition}
              onChangeText={setMedicalCondition}
              placeholder="e.g., Chronic pain, Epilepsy, Anxiety"
              multiline
              numberOfLines={2}
            />

            <Input
              label="Prescribing Doctor"
              value={prescribingDoctor}
              onChangeText={setPrescribingDoctor}
              placeholder="Dr. Full Name"
            />

            <Input
              label="Doctor CRM"
              value={doctorCrm}
              onChangeText={setDoctorCrm}
              placeholder="CRM/UF XXXXXX"
            />
          </Card>

          {/* Prescription */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Prescription</Text>
            </View>

            <Input
              label="Prescription Date"
              value={prescriptionDate}
              onChangeText={setPrescriptionDate}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Expiration Date"
              value={prescriptionExpiration}
              onChangeText={setPrescriptionExpiration}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Prescription File URL"
              value={prescriptionFileUrl}
              onChangeText={setPrescriptionFileUrl}
              placeholder="https://... (file upload coming soon)"
              autoCapitalize="none"
            />
            <Text style={styles.inputHint}>
              File upload feature coming soon. For now, you can paste a URL to the prescription document.
            </Text>
          </Card>

          {/* Consent */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-circle" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Consent</Text>
            </View>

            <Input
              label="Consent Signed Date"
              value={consentDate}
              onChangeText={setConsentDate}
              placeholder="YYYY-MM-DD"
            />

            <Input
              label="Consent File URL"
              value={consentFileUrl}
              onChangeText={setConsentFileUrl}
              placeholder="https://... (file upload coming soon)"
              autoCapitalize="none"
            />
            <Text style={styles.inputHint}>
              File upload feature coming soon. For now, you can paste a URL to the signed consent form.
            </Text>
          </Card>

          {/* Notes */}
          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="create" size={20} color="#0288D1" />
              <Text style={styles.sectionTitle}>Additional Notes</Text>
            </View>

            <Input
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional information about the patient..."
              multiline
              numberOfLines={4}
              style={styles.notesInput}
            />
          </Card>

          {/* Submit Buttons */}
          <Button
            title={submitting ? 'Registering...' : 'Register Patient'}
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
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0288D1',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#0277BD',
    lineHeight: 18,
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
    paddingVertical: 12,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  documentTypeTextActive: {
    color: '#fff',
  },
  inputHint: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#0288D1',
    marginTop: 8,
  },
});


