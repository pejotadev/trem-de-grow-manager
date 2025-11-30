import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../../../contexts/AuthContext';
import { createDocument } from '../../../../firebase/documents';
import { DocumentType, ProtocolCategory, DocumentStatus } from '../../../../types';
import { Card } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { DatePicker } from '../../../../components/DatePicker';
import { Ionicons } from '@expo/vector-icons';

const DOCUMENT_TYPE_INFO: Record<DocumentType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string; description: string }> = {
  protocol: { label: 'Protocol', icon: 'document-text', color: '#4CAF50', description: 'Standard operating procedures' },
  statute: { label: 'Statute', icon: 'book', color: '#2196F3', description: 'Organizational bylaws' },
  regulation: { label: 'Regulation', icon: 'shield-checkmark', color: '#9C27B0', description: 'Internal rules and policies' },
  consent_template: { label: 'Consent Template', icon: 'create', color: '#FF9800', description: 'Patient consent forms' },
  meeting_minutes: { label: 'Meeting Minutes', icon: 'people', color: '#00BCD4', description: 'Board/team meeting records' },
  other: { label: 'Other', icon: 'document', color: '#607D8B', description: 'Other institutional documents' },
};

const CATEGORY_INFO: Record<ProtocolCategory, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  cultivation: { label: 'Cultivation', icon: 'leaf', color: '#4CAF50' },
  security: { label: 'Security', icon: 'shield', color: '#F44336' },
  hygiene: { label: 'Hygiene', icon: 'water', color: '#2196F3' },
  extraction: { label: 'Extraction', icon: 'flask', color: '#FF9800' },
  distribution: { label: 'Distribution', icon: 'gift', color: '#9C27B0' },
  disposal: { label: 'Disposal', icon: 'trash', color: '#795548' },
  emergency: { label: 'Emergency', icon: 'warning', color: '#E91E63' },
  other: { label: 'Other', icon: 'ellipsis-horizontal', color: '#607D8B' },
};

const STATUS_INFO: Record<DocumentStatus, { label: string; color: string; description: string }> = {
  draft: { label: 'Draft', color: '#FF9800', description: 'Work in progress' },
  active: { label: 'Active', color: '#4CAF50', description: 'Currently in effect' },
  archived: { label: 'Archived', color: '#9E9E9E', description: 'No longer active' },
};

const DOCUMENT_TYPES: DocumentType[] = ['protocol', 'statute', 'regulation', 'consent_template', 'meeting_minutes', 'other'];
const CATEGORIES: ProtocolCategory[] = ['cultivation', 'security', 'hygiene', 'extraction', 'distribution', 'disposal', 'emergency', 'other'];
const STATUSES: DocumentStatus[] = ['draft', 'active', 'archived'];

export default function NewDocumentScreen() {
  const [documentType, setDocumentType] = useState<DocumentType>('protocol');
  const [category, setCategory] = useState<ProtocolCategory | undefined>('cultivation');
  const [title, setTitle] = useState('');
  const [version, setVersion] = useState('1.0');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [effectiveDate, setEffectiveDate] = useState<Date | null>(new Date());
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [approvedBy, setApprovedBy] = useState('');
  const [status, setStatus] = useState<DocumentStatus>('draft');
  const [saving, setSaving] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a document title');
      return;
    }

    if (!version.trim()) {
      Alert.alert('Error', 'Please enter a version number');
      return;
    }

    if (!effectiveDate) {
      Alert.alert('Error', 'Please select an effective date');
      return;
    }

    if (!userData?.uid) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    setSaving(true);

    try {
      await createDocument({
        userId: userData.uid,
        documentType,
        category: documentType === 'protocol' ? category : undefined,
        title: title.trim(),
        version: version.trim(),
        content: content.trim() || undefined,
        fileUrl: fileUrl.trim() || undefined,
        effectiveDate: effectiveDate.getTime(),
        expirationDate: expirationDate?.getTime(),
        approvedBy: approvedBy.trim() || undefined,
        status,
      });

      Alert.alert('Success', 'Document created successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('[NewDocument] Error creating document:', error);
      Alert.alert('Error', 'Failed to create document: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const selectedTypeInfo = DOCUMENT_TYPE_INFO[documentType];
  const showCategorySelector = documentType === 'protocol';

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Document Type Selector */}
          <Card>
            <Text style={styles.sectionTitle}>Document Type</Text>
            <Text style={styles.sectionSubtitle}>Select the type of document you're creating</Text>

            <View style={styles.typeGrid}>
              {DOCUMENT_TYPES.map((type) => {
                const info = DOCUMENT_TYPE_INFO[type];
                const isSelected = documentType === type;
                return (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      isSelected && styles.typeOptionSelected,
                      isSelected && { borderColor: info.color },
                    ]}
                    onPress={() => setDocumentType(type)}
                  >
                    <View style={[styles.typeIconContainer, { backgroundColor: info.color + '20' }]}>
                      <Ionicons name={info.icon} size={24} color={info.color} />
                    </View>
                    <Text style={[styles.typeOptionLabel, isSelected && { color: info.color }]}>
                      {info.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={info.color} style={styles.typeCheckmark} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.typeDescription}>
              <Ionicons name={selectedTypeInfo.icon} size={18} color={selectedTypeInfo.color} />
              <Text style={styles.typeDescriptionText}>{selectedTypeInfo.description}</Text>
            </View>
          </Card>

          {/* Category Selector (for Protocols) */}
          {showCategorySelector && (
            <Card>
              <Text style={styles.sectionTitle}>Protocol Category</Text>

              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  const isSelected = category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryOption,
                        isSelected && styles.categoryOptionSelected,
                        isSelected && { backgroundColor: info.color + '20', borderColor: info.color },
                      ]}
                      onPress={() => setCategory(cat)}
                    >
                      <Ionicons
                        name={info.icon}
                        size={16}
                        color={isSelected ? info.color : '#666'}
                      />
                      <Text style={[
                        styles.categoryOptionText,
                        isSelected && { color: info.color, fontWeight: '600' },
                      ]}>
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Card>
          )}

          {/* Document Details */}
          <Card>
            <Text style={styles.sectionTitle}>Document Details</Text>

            <Input
              label="Title *"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Standard Operating Procedure for Harvesting"
            />

            <Input
              label="Version *"
              value={version}
              onChangeText={setVersion}
              placeholder="e.g., 1.0"
            />

            <Input
              label="Approved By"
              value={approvedBy}
              onChangeText={setApprovedBy}
              placeholder="e.g., Board of Directors"
            />
          </Card>

          {/* Dates */}
          <Card>
            <Text style={styles.sectionTitle}>Dates</Text>

            <DatePicker
              label="Effective Date *"
              value={effectiveDate}
              onChange={setEffectiveDate}
              placeholder="Select effective date"
            />

            <DatePicker
              label="Expiration Date"
              value={expirationDate}
              onChange={setExpirationDate}
              placeholder="Optional - select if document expires"
              minimumDate={effectiveDate || undefined}
            />
          </Card>

          {/* Status */}
          <Card>
            <Text style={styles.sectionTitle}>Status</Text>

            <View style={styles.statusOptions}>
              {STATUSES.map((s) => {
                const info = STATUS_INFO[s];
                const isSelected = status === s;
                return (
                  <TouchableOpacity
                    key={s}
                    style={[
                      styles.statusOption,
                      isSelected && styles.statusOptionSelected,
                      isSelected && { backgroundColor: info.color, borderColor: info.color },
                    ]}
                    onPress={() => setStatus(s)}
                  >
                    <Text style={[
                      styles.statusOptionText,
                      isSelected && styles.statusOptionTextSelected,
                    ]}>
                      {info.label}
                    </Text>
                    <Text style={[
                      styles.statusOptionDescription,
                      isSelected && { color: '#fff' },
                    ]}>
                      {info.description}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Card>

          {/* Content */}
          <Card>
            <Text style={styles.sectionTitle}>Content</Text>
            <Text style={styles.sectionSubtitle}>
              Enter the document content or paste a file URL
            </Text>

            <Input
              label="Document Content"
              value={content}
              onChangeText={setContent}
              placeholder="Enter the document content here... (supports markdown)"
              multiline
              numberOfLines={8}
              style={styles.contentInput}
            />

            <View style={styles.orDivider}>
              <View style={styles.orLine} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.orLine} />
            </View>

            <Input
              label="File URL"
              value={fileUrl}
              onChangeText={setFileUrl}
              placeholder="https://... (link to PDF, Google Doc, etc.)"
              autoCapitalize="none"
              keyboardType="url"
            />
          </Card>

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              title={saving ? 'Saving...' : 'Create Document'}
              onPress={handleSave}
              disabled={saving}
            />
            <Button
              title="Cancel"
              onPress={() => router.back()}
              variant="secondary"
              disabled={saving}
            />
          </View>
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
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  // Type Selector
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  typeOptionSelected: {
    backgroundColor: '#f8f8f8',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  typeOptionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  typeCheckmark: {
    marginLeft: 'auto',
  },
  typeDescription: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  typeDescriptionText: {
    fontSize: 13,
    color: '#666',
    flex: 1,
  },
  // Category Selector
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  categoryOptionSelected: {
    borderWidth: 2,
  },
  categoryOptionText: {
    fontSize: 13,
    color: '#666',
  },
  // Status Options
  statusOptions: {
    gap: 10,
  },
  statusOption: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  statusOptionSelected: {
    borderWidth: 2,
  },
  statusOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  statusOptionTextSelected: {
    color: '#fff',
  },
  statusOptionDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  // Content
  contentInput: {
    minHeight: 150,
    textAlignVertical: 'top',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  orText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  // Actions
  actions: {
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
});

