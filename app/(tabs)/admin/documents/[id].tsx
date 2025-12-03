import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Linking,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  getDocument,
  updateDocument,
  archiveDocument,
  activateDocument,
  deleteDocument,
  getDocumentVersions,
} from '../../../../firebase/documents';
import { InstitutionalDocument, DocumentType, ProtocolCategory, DocumentStatus } from '../../../../types';
import { Card } from '../../../../components/Card';
import { Button } from '../../../../components/Button';
import { Input } from '../../../../components/Input';
import { DatePicker } from '../../../../components/DatePicker';
import { Loading } from '../../../../components/Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

const DOCUMENT_TYPE_INFO: Record<DocumentType, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  protocol: { label: 'Protocol', icon: 'document-text', color: '#4CAF50' },
  statute: { label: 'Statute', icon: 'book', color: '#2196F3' },
  regulation: { label: 'Regulation', icon: 'shield-checkmark', color: '#9C27B0' },
  consent_template: { label: 'Consent Template', icon: 'create', color: '#FF9800' },
  meeting_minutes: { label: 'Meeting Minutes', icon: 'people', color: '#00BCD4' },
  other: { label: 'Other', icon: 'document', color: '#607D8B' },
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

const STATUS_INFO: Record<DocumentStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#FF9800' },
  active: { label: 'Active', color: '#4CAF50' },
  archived: { label: 'Archived', color: '#9E9E9E' },
};

export default function DocumentDetailScreen() {
  const { id } = useLocalSearchParams();
  const [document, setDocument] = useState<InstitutionalDocument | null>(null);
  const [versions, setVersions] = useState<InstitutionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Edit modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editVersion, setEditVersion] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editFileUrl, setEditFileUrl] = useState('');
  const [editApprovedBy, setEditApprovedBy] = useState('');
  const [editEffectiveDate, setEditEffectiveDate] = useState<Date | null>(null);
  const [editExpirationDate, setEditExpirationDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Version history modal
  const [versionsModalVisible, setVersionsModalVisible] = useState(false);

  const { userData } = useAuth();
  const router = useRouter();

  const loadDocument = async () => {
    if (!id || typeof id !== 'string') {
      setLoading(false);
      return;
    }

    try {
      const docData = await getDocument(id);
      setDocument(docData);

      // Load version history if document exists
      if (docData && userData?.uid) {
        const versionHistory = await getDocumentVersions(userData.uid, docData.title);
        setVersions(versionHistory);
      }
    } catch (error) {
      console.error('[DocumentDetail] Error loading document:', error);
      Alert.alert('Error', 'Failed to load document');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocument();
    }, [id, userData?.uid])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocument();
  };

  const openEditModal = () => {
    if (document) {
      setEditTitle(document.title);
      setEditVersion(document.version);
      setEditContent(document.content || '');
      setEditFileUrl(document.fileUrl || '');
      setEditApprovedBy(document.approvedBy || '');
      setEditEffectiveDate(new Date(document.effectiveDate));
      setEditExpirationDate(document.expirationDate ? new Date(document.expirationDate) : null);
      setEditModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!document || !id || typeof id !== 'string') return;

    if (!editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setSaving(true);

    try {
      await updateDocument(id, {
        title: editTitle.trim(),
        version: editVersion.trim(),
        content: editContent.trim() || undefined,
        fileUrl: editFileUrl.trim() || undefined,
        approvedBy: editApprovedBy.trim() || undefined,
        effectiveDate: editEffectiveDate?.getTime() || document.effectiveDate,
        expirationDate: editExpirationDate?.getTime(),
      });

      setEditModalVisible(false);
      loadDocument();
      Alert.alert('Success', 'Document updated successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to update document: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = () => {
    Alert.alert(
      'Archive Document',
      'Are you sure you want to archive this document? It will no longer appear as active.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await archiveDocument(id);
              loadDocument();
              Alert.alert('Success', 'Document archived');
            } catch (error) {
              Alert.alert('Error', 'Failed to archive document');
            }
          },
        },
      ]
    );
  };

  const handleActivate = async () => {
    if (!id || typeof id !== 'string') return;
    try {
      await activateDocument(id);
      loadDocument();
      Alert.alert('Success', 'Document activated');
    } catch (error) {
      Alert.alert('Error', 'Failed to activate document');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Document',
      'Are you sure you want to permanently delete this document? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id || typeof id !== 'string') return;
            try {
              await deleteDocument(id);
              Alert.alert('Success', 'Document deleted', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete document');
            }
          },
        },
      ]
    );
  };

  const openFileUrl = () => {
    if (document?.fileUrl) {
      Linking.openURL(document.fileUrl).catch(() => {
        Alert.alert('Error', 'Could not open file URL');
      });
    }
  };

  const isExpired = document?.expirationDate ? document.expirationDate < Date.now() : false;

  if (loading) {
    return <Loading message="Loading document..." />;
  }

  if (!document) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="document-text-outline" size={64} color="#ccc" />
          <Text style={styles.errorText}>Document not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const typeInfo = DOCUMENT_TYPE_INFO[document.documentType];
  const categoryInfo = document.category ? CATEGORY_INFO[document.category] : null;
  const statusInfo = STATUS_INFO[document.status];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <Card>
          <View style={styles.header}>
            <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
              <Ionicons name={typeInfo.icon} size={32} color={typeInfo.color} />
            </View>
            <View style={styles.headerInfo}>
              <View style={[styles.typeBadge, { backgroundColor: typeInfo.color }]}>
                <Text style={styles.typeBadgeText}>{typeInfo.label}</Text>
              </View>
              <Text style={styles.documentTitle}>{document.title}</Text>
              <View style={styles.versionRow}>
                <View style={styles.versionBadge}>
                  <Text style={styles.versionText}>v{document.version}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                  <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Category (for protocols) */}
          {categoryInfo && (
            <View style={[styles.categoryBanner, { backgroundColor: categoryInfo.color + '15' }]}>
              <Ionicons name={categoryInfo.icon} size={18} color={categoryInfo.color} />
              <Text style={[styles.categoryBannerText, { color: categoryInfo.color }]}>
                {categoryInfo.label} Protocol
              </Text>
            </View>
          )}

          {/* Expired Warning */}
          {isExpired && (
            <View style={styles.expiredBanner}>
              <Ionicons name="warning" size={20} color="#F44336" />
              <Text style={styles.expiredBannerText}>
                This document expired on {format(new Date(document.expirationDate!), 'MMM dd, yyyy')}
              </Text>
            </View>
          )}
        </Card>

        {/* Dates & Approval */}
        <Card>
          <Text style={styles.sectionTitle}>Document Information</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={18} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Effective Date</Text>
              <Text style={styles.infoValue}>
                {format(new Date(document.effectiveDate), 'MMMM dd, yyyy')}
              </Text>
            </View>
          </View>

          {document.expirationDate && (
            <View style={styles.infoRow}>
              <Ionicons
                name="time"
                size={18}
                color={isExpired ? '#F44336' : '#666'}
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Expiration Date</Text>
                <Text style={[styles.infoValue, isExpired && styles.infoValueExpired]}>
                  {format(new Date(document.expirationDate), 'MMMM dd, yyyy')}
                  {isExpired && ' (Expired)'}
                </Text>
              </View>
            </View>
          )}

          {document.approvedBy && (
            <View style={styles.infoRow}>
              <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Approved By</Text>
                <Text style={styles.infoValue}>{document.approvedBy}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>
                {format(new Date(document.updatedAt), 'MMM dd, yyyy HH:mm')}
              </Text>
            </View>
          </View>
        </Card>

        {/* Content */}
        {document.content && (
          <Card>
            <Text style={styles.sectionTitle}>Content</Text>
            <View style={styles.contentContainer}>
              <Text style={styles.contentText}>{document.content}</Text>
            </View>
          </Card>
        )}

        {/* File URL */}
        {document.fileUrl && (
          <Card>
            <Text style={styles.sectionTitle}>Attached File</Text>
            <TouchableOpacity style={styles.fileLink} onPress={openFileUrl}>
              <Ionicons name="document-attach" size={24} color="#2196F3" />
              <View style={styles.fileLinkContent}>
                <Text style={styles.fileLinkText}>View/Download Document</Text>
                <Text style={styles.fileLinkUrl} numberOfLines={1}>
                  {document.fileUrl}
                </Text>
              </View>
              <Ionicons name="open-outline" size={20} color="#2196F3" />
            </TouchableOpacity>
          </Card>
        )}

        {/* Version History */}
        {versions.length > 1 && (
          <Card>
            <TouchableOpacity
              style={styles.versionHistoryHeader}
              onPress={() => setVersionsModalVisible(true)}
            >
              <Ionicons name="git-branch" size={20} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Version History</Text>
              <View style={styles.versionCountBadge}>
                <Text style={styles.versionCountText}>{versions.length}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>

            <Text style={styles.versionHistoryHint}>
              Tap to view all versions of this document
            </Text>
          </Card>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button title="Edit Document" onPress={openEditModal} />

          <View style={styles.actionRow}>
            {document.status === 'active' ? (
              <Button
                title="Archive"
                onPress={handleArchive}
                variant="secondary"
                style={styles.actionButton}
              />
            ) : (
              <Button
                title="Activate"
                onPress={handleActivate}
                variant="secondary"
                style={styles.actionButton}
              />
            )}
            <Button
              title="Delete"
              onPress={handleDelete}
              variant="danger"
              style={styles.actionButton}
            />
          </View>
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Edit Document</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Input
                label="Title *"
                value={editTitle}
                onChangeText={setEditTitle}
              />
              <Input
                label="Version"
                value={editVersion}
                onChangeText={setEditVersion}
              />
              <Input
                label="Approved By"
                value={editApprovedBy}
                onChangeText={setEditApprovedBy}
              />
              <DatePicker
                label="Effective Date"
                value={editEffectiveDate}
                onChange={setEditEffectiveDate}
              />
              <DatePicker
                label="Expiration Date"
                value={editExpirationDate}
                onChange={setEditExpirationDate}
                minimumDate={editEffectiveDate || undefined}
              />
              <Input
                label="Content"
                value={editContent}
                onChangeText={setEditContent}
                multiline
                numberOfLines={6}
              />
              <Input
                label="File URL"
                value={editFileUrl}
                onChangeText={setEditFileUrl}
                autoCapitalize="none"
              />
            </ScrollView>
            <View style={styles.modalButtons}>
              <Button
                title={saving ? 'Saving...' : 'Save Changes'}
                onPress={handleSaveEdit}
                disabled={saving}
              />
              <Button
                title="Cancel"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
                disabled={saving}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Version History Modal */}
      <Modal
        visible={versionsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setVersionsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Version History</Text>
            <ScrollView>
              {versions.map((ver, index) => {
                const isCurrent = ver.id === document?.id;
                const verStatusInfo = STATUS_INFO[ver.status];
                return (
                  <TouchableOpacity
                    key={ver.id}
                    style={[styles.versionItem, isCurrent && styles.versionItemCurrent]}
                    onPress={() => {
                      setVersionsModalVisible(false);
                      if (!isCurrent) {
                        router.push(`/(tabs)/admin/documents/${ver.id}`);
                      }
                    }}
                    disabled={isCurrent}
                  >
                    <View style={styles.versionItemHeader}>
                      <Text style={styles.versionItemVersion}>v{ver.version}</Text>
                      <View style={[styles.versionItemStatus, { backgroundColor: verStatusInfo.color }]}>
                        <Text style={styles.versionItemStatusText}>{verStatusInfo.label}</Text>
                      </View>
                      {isCurrent && (
                        <View style={styles.currentBadge}>
                          <Text style={styles.currentBadgeText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.versionItemDate}>
                      {format(new Date(ver.createdAt), 'MMM dd, yyyy HH:mm')}
                    </Text>
                    {ver.approvedBy && (
                      <Text style={styles.versionItemApproved}>
                        Approved by: {ver.approvedBy}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Button
              title="Close"
              onPress={() => setVersionsModalVisible(false)}
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
    marginTop: 16,
    marginBottom: 24,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  typeIcon: {
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
  typeBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  documentTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  versionBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  versionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  categoryBannerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  expiredBannerText: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '500',
    flex: 1,
  },
  // Sections
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
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
  infoValue: {
    fontSize: 15,
    color: '#333',
  },
  infoValueExpired: {
    color: '#F44336',
    fontWeight: '500',
  },
  // Content
  contentContainer: {
    backgroundColor: '#f8f8f8',
    padding: 16,
    borderRadius: 10,
  },
  contentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  // File Link
  fileLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 14,
    borderRadius: 10,
    gap: 12,
  },
  fileLinkContent: {
    flex: 1,
  },
  fileLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  fileLinkUrl: {
    fontSize: 12,
    color: '#1565C0',
    marginTop: 2,
  },
  // Version History
  versionHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  versionCountBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  versionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  versionHistoryHint: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  // Actions
  actions: {
    marginTop: 8,
    marginBottom: 24,
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
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
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  modalButtons: {
    marginTop: 12,
    gap: 8,
  },
  // Version Items
  versionItem: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    marginBottom: 8,
  },
  versionItemCurrent: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  versionItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  versionItemVersion: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  versionItemStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  versionItemStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  currentBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  versionItemDate: {
    fontSize: 13,
    color: '#666',
  },
  versionItemApproved: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
});




