import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserDocuments, searchDocuments, DocumentFilters } from '../../../firebase/documents';
import { InstitutionalDocument, DocumentType, ProtocolCategory, DocumentStatus } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
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

const DOCUMENT_TYPES: DocumentType[] = ['protocol', 'statute', 'regulation', 'consent_template', 'meeting_minutes', 'other'];
const CATEGORIES: ProtocolCategory[] = ['cultivation', 'security', 'hygiene', 'extraction', 'distribution', 'disposal', 'emergency', 'other'];
const STATUSES: DocumentStatus[] = ['draft', 'active', 'archived'];

export default function DocumentsScreen() {
  const [documents, setDocuments] = useState<InstitutionalDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  
  // Filter state
  const [selectedType, setSelectedType] = useState<DocumentType | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<ProtocolCategory | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<DocumentStatus | undefined>();

  const { userData } = useAuth();
  const router = useRouter();

  const loadDocuments = async () => {
    if (!userData?.uid) {
      setLoading(false);
      return;
    }

    try {
      const filters: DocumentFilters = {};
      if (selectedType) filters.documentType = selectedType;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedStatus) filters.status = selectedStatus;

      const hasFilters = selectedType || selectedCategory || selectedStatus;
      
      let docs: InstitutionalDocument[];
      if (hasFilters) {
        docs = await searchDocuments(userData.uid, filters);
      } else {
        docs = await getUserDocuments(userData.uid);
      }

      setDocuments(docs);
    } catch (error) {
      console.error('[DocumentsScreen] Error loading documents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadDocuments();
    }, [userData?.uid, selectedType, selectedCategory, selectedStatus])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadDocuments();
  };

  const clearFilters = () => {
    setSelectedType(undefined);
    setSelectedCategory(undefined);
    setSelectedStatus(undefined);
    setFilterModalVisible(false);
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setLoading(true);
    loadDocuments();
  };

  // Group documents by type
  const groupedDocuments = documents.reduce((groups, doc) => {
    const type = doc.documentType;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(doc);
    return groups;
  }, {} as Record<DocumentType, InstitutionalDocument[]>);

  const hasActiveFilters = selectedType || selectedCategory || selectedStatus;

  const isExpired = (doc: InstitutionalDocument): boolean => {
    return doc.expirationDate ? doc.expirationDate < Date.now() : false;
  };

  if (loading) {
    return <Loading message="Loading documents..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Actions */}
      <View style={styles.headerActions}>
        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons
            name="filter"
            size={20}
            color={hasActiveFilters ? '#fff' : '#666'}
          />
          <Text style={[styles.filterButtonText, hasActiveFilters && styles.filterButtonTextActive]}>
            Filters {hasActiveFilters ? '(Active)' : ''}
          </Text>
        </TouchableOpacity>

        {hasActiveFilters && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(tabs)/admin/documents/new')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          {selectedType && (
            <View style={[styles.filterPill, { backgroundColor: DOCUMENT_TYPE_INFO[selectedType].color + '20' }]}>
              <Ionicons name={DOCUMENT_TYPE_INFO[selectedType].icon} size={14} color={DOCUMENT_TYPE_INFO[selectedType].color} />
              <Text style={[styles.filterPillText, { color: DOCUMENT_TYPE_INFO[selectedType].color }]}>
                {DOCUMENT_TYPE_INFO[selectedType].label}
              </Text>
            </View>
          )}
          {selectedCategory && (
            <View style={[styles.filterPill, { backgroundColor: CATEGORY_INFO[selectedCategory].color + '20' }]}>
              <Ionicons name={CATEGORY_INFO[selectedCategory].icon} size={14} color={CATEGORY_INFO[selectedCategory].color} />
              <Text style={[styles.filterPillText, { color: CATEGORY_INFO[selectedCategory].color }]}>
                {CATEGORY_INFO[selectedCategory].label}
              </Text>
            </View>
          )}
          {selectedStatus && (
            <View style={[styles.filterPill, { backgroundColor: STATUS_INFO[selectedStatus].color + '20' }]}>
              <Text style={[styles.filterPillText, { color: STATUS_INFO[selectedStatus].color }]}>
                {STATUS_INFO[selectedStatus].label}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Documents List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {documents.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No documents found</Text>
              <Text style={styles.emptySubtext}>
                {hasActiveFilters
                  ? 'Try adjusting your filters'
                  : 'Create your first protocol or document'}
              </Text>
              {!hasActiveFilters && (
                <Button
                  title="Add Document"
                  onPress={() => router.push('/(tabs)/admin/documents/new')}
                  style={styles.emptyButton}
                />
              )}
            </View>
          </Card>
        ) : (
          Object.entries(groupedDocuments).map(([type, docs]) => {
            const typeInfo = DOCUMENT_TYPE_INFO[type as DocumentType];
            return (
              <View key={type} style={styles.typeSection}>
                <View style={styles.typeSectionHeader}>
                  <View style={[styles.typeIcon, { backgroundColor: typeInfo.color + '20' }]}>
                    <Ionicons name={typeInfo.icon} size={20} color={typeInfo.color} />
                  </View>
                  <Text style={styles.typeSectionTitle}>{typeInfo.label}s</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{docs.length}</Text>
                  </View>
                </View>

                {docs.map((doc) => {
                  const expired = isExpired(doc);
                  const statusInfo = STATUS_INFO[doc.status];
                  const categoryInfo = doc.category ? CATEGORY_INFO[doc.category] : null;

                  return (
                    <TouchableOpacity
                      key={doc.id}
                      onPress={() => router.push(`/(tabs)/admin/documents/${doc.id}`)}
                    >
                      <Card style={[styles.documentCard, expired && styles.documentCardExpired]}>
                        <View style={styles.documentHeader}>
                          <Text style={styles.documentTitle} numberOfLines={1}>
                            {doc.title}
                          </Text>
                          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                            <Text style={styles.statusBadgeText}>{statusInfo.label}</Text>
                          </View>
                        </View>

                        <View style={styles.documentMeta}>
                          <View style={styles.versionBadge}>
                            <Text style={styles.versionText}>v{doc.version}</Text>
                          </View>

                          {categoryInfo && (
                            <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color + '15' }]}>
                              <Ionicons name={categoryInfo.icon} size={12} color={categoryInfo.color} />
                              <Text style={[styles.categoryBadgeText, { color: categoryInfo.color }]}>
                                {categoryInfo.label}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.documentDates}>
                          <View style={styles.dateItem}>
                            <Ionicons name="calendar-outline" size={14} color="#666" />
                            <Text style={styles.dateText}>
                              Effective: {format(new Date(doc.effectiveDate), 'MMM dd, yyyy')}
                            </Text>
                          </View>
                          {doc.expirationDate && (
                            <View style={styles.dateItem}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={expired ? '#F44336' : '#666'}
                              />
                              <Text style={[styles.dateText, expired && styles.dateTextExpired]}>
                                {expired ? 'Expired: ' : 'Expires: '}
                                {format(new Date(doc.expirationDate), 'MMM dd, yyyy')}
                              </Text>
                            </View>
                          )}
                        </View>

                        {expired && (
                          <View style={styles.expiredBanner}>
                            <Ionicons name="warning" size={14} color="#F44336" />
                            <Text style={styles.expiredBannerText}>Document expired</Text>
                          </View>
                        )}
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter Documents</Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Document Type Filter */}
              <Text style={styles.filterLabel}>Document Type</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedType && styles.filterOptionSelected]}
                  onPress={() => setSelectedType(undefined)}
                >
                  <Text style={[styles.filterOptionText, !selectedType && styles.filterOptionTextSelected]}>
                    All
                  </Text>
                </TouchableOpacity>
                {DOCUMENT_TYPES.map((type) => {
                  const info = DOCUMENT_TYPE_INFO[type];
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        selectedType === type && styles.filterOptionSelected,
                        { borderColor: info.color },
                      ]}
                      onPress={() => setSelectedType(type)}
                    >
                      <Ionicons
                        name={info.icon}
                        size={14}
                        color={selectedType === type ? '#fff' : info.color}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        selectedType === type && styles.filterOptionTextSelected,
                      ]}>
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category Filter */}
              <Text style={styles.filterLabel}>Category (Protocols)</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedCategory && styles.filterOptionSelected]}
                  onPress={() => setSelectedCategory(undefined)}
                >
                  <Text style={[styles.filterOptionText, !selectedCategory && styles.filterOptionTextSelected]}>
                    All
                  </Text>
                </TouchableOpacity>
                {CATEGORIES.map((cat) => {
                  const info = CATEGORY_INFO[cat];
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterOption,
                        selectedCategory === cat && styles.filterOptionSelected,
                        { borderColor: info.color },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Ionicons
                        name={info.icon}
                        size={14}
                        color={selectedCategory === cat ? '#fff' : info.color}
                      />
                      <Text style={[
                        styles.filterOptionText,
                        selectedCategory === cat && styles.filterOptionTextSelected,
                      ]}>
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status Filter */}
              <Text style={styles.filterLabel}>Status</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[styles.filterOption, !selectedStatus && styles.filterOptionSelected]}
                  onPress={() => setSelectedStatus(undefined)}
                >
                  <Text style={[styles.filterOptionText, !selectedStatus && styles.filterOptionTextSelected]}>
                    All
                  </Text>
                </TouchableOpacity>
                {STATUSES.map((status) => {
                  const info = STATUS_INFO[status];
                  return (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        selectedStatus === status && styles.filterOptionSelected,
                        { borderColor: info.color },
                      ]}
                      onPress={() => setSelectedStatus(status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        selectedStatus === status && styles.filterOptionTextSelected,
                      ]}>
                        {info.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Button title="Apply Filters" onPress={applyFilters} />
              <Button title="Clear All" onPress={clearFilters} variant="secondary" />
              <Button title="Cancel" onPress={() => setFilterModalVisible(false)} variant="secondary" />
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#4CAF50',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearButtonText: {
    fontSize: 14,
    color: '#F44336',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 24,
  },
  // Type Section
  typeSection: {
    marginBottom: 24,
  },
  typeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  countBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  // Document Card
  documentCard: {
    marginBottom: 8,
  },
  documentCardExpired: {
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  documentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 12,
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
  documentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  versionBadge: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  documentDates: {
    gap: 4,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#666',
  },
  dateTextExpired: {
    color: '#F44336',
    fontWeight: '500',
  },
  expiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  expiredBannerText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '500',
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
    marginBottom: 20,
    color: '#333',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
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
  filterOptionSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#666',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  modalButtons: {
    marginTop: 20,
    gap: 8,
  },
});



