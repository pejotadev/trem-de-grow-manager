import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  Platform,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { 
  searchAuditLogs, 
  getRecentAuditLogs,
  AuditLogFilters 
} from '../../../firebase/auditLog';
import { AuditLog, AuditAction } from '../../../types';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { Loading } from '../../../components/Loading';
import { DatePicker } from '../../../components/DatePicker';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

const ENTITY_TYPES = ['plant', 'harvest', 'patient', 'distribution', 'extract', 'environment'];
const ACTIONS: AuditAction[] = ['create', 'update', 'delete'];

const ACTION_ICONS: Record<AuditAction, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
  create: { name: 'add-circle', color: '#4CAF50' },
  update: { name: 'pencil', color: '#2196F3' },
  delete: { name: 'trash', color: '#F44336' },
};

const ACTION_LABELS: Record<AuditAction, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
};

const ENTITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  plant: 'leaf',
  harvest: 'cut',
  patient: 'person',
  distribution: 'share',
  extract: 'flask',
  environment: 'cube',
};

const ENTITY_COLORS: Record<string, string> = {
  plant: '#4CAF50',
  harvest: '#FF9800',
  patient: '#9C27B0',
  distribution: '#2196F3',
  extract: '#00BCD4',
  environment: '#795548',
};

export default function AuditLogScreen() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedEntityType, setSelectedEntityType] = useState<string | undefined>();
  const [selectedAction, setSelectedAction] = useState<AuditAction | undefined>();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const { userData } = useAuth();

  const loadLogs = async () => {
    try {
      const filters: AuditLogFilters = {
        limit: 100,
      };
      
      if (selectedEntityType) {
        filters.entityType = selectedEntityType;
      }
      if (selectedAction) {
        filters.action = selectedAction;
      }
      if (startDate) {
        filters.startDate = startDate.getTime();
      }
      if (endDate) {
        // Set to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        filters.endDate = endOfDay.getTime();
      }
      
      const hasFilters = selectedEntityType || selectedAction || startDate || endDate;
      
      let logsData: AuditLog[];
      if (hasFilters) {
        logsData = await searchAuditLogs(filters);
      } else {
        logsData = await getRecentAuditLogs(100);
      }
      
      setLogs(logsData);
    } catch (error) {
      console.error('[AuditLogScreen] Error loading logs:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLogs();
    }, [selectedEntityType, selectedAction, startDate, endDate])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs();
  };

  const clearFilters = () => {
    setSelectedEntityType(undefined);
    setSelectedAction(undefined);
    setStartDate(null);
    setEndDate(null);
    setFilterModalVisible(false);
  };

  const applyFilters = () => {
    setFilterModalVisible(false);
    setLoading(true);
    loadLogs();
  };

  const toggleExpand = (logId: string) => {
    setExpandedLogId(expandedLogId === logId ? null : logId);
  };

  const parseJsonSafe = (str: string | undefined): any => {
    if (!str) return null;
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  const renderChangedFields = (log: AuditLog) => {
    if (!log.changedFields || log.changedFields.length === 0) return null;
    
    return (
      <View style={styles.changedFieldsContainer}>
        <Text style={styles.changedFieldsLabel}>Changed Fields:</Text>
        <View style={styles.changedFieldsList}>
          {log.changedFields.map((field, index) => (
            <View key={index} style={styles.changedFieldBadge}>
              <Text style={styles.changedFieldText}>{field}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderExpandedContent = (log: AuditLog) => {
    const previousValue = parseJsonSafe(log.previousValue);
    const newValue = parseJsonSafe(log.newValue);
    
    return (
      <View style={styles.expandedContent}>
        {log.action === 'update' && renderChangedFields(log)}
        
        {previousValue && (
          <View style={styles.valueSection}>
            <Text style={styles.valueSectionTitle}>
              {log.action === 'delete' ? 'Deleted Data:' : 'Previous Value:'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(previousValue, null, 2)}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
        
        {newValue && log.action !== 'delete' && (
          <View style={styles.valueSection}>
            <Text style={styles.valueSectionTitle}>
              {log.action === 'create' ? 'Created Data:' : 'New Value:'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(newValue, null, 2)}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
        
        {log.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesSectionTitle}>Notes:</Text>
            <Text style={styles.notesText}>{log.notes}</Text>
          </View>
        )}
      </View>
    );
  };

  const hasActiveFilters = selectedEntityType || selectedAction || startDate || endDate;

  if (loading) {
    return <Loading message="Loading audit logs..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Filter Bar */}
      <View style={styles.filterBar}>
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
        
        <Text style={styles.resultCount}>{logs.length} entries</Text>
      </View>

      {/* Active Filter Pills */}
      {hasActiveFilters && (
        <View style={styles.activeFilters}>
          {selectedEntityType && (
            <View style={[styles.filterPill, { backgroundColor: ENTITY_COLORS[selectedEntityType] + '20' }]}>
              <Ionicons name={ENTITY_ICONS[selectedEntityType]} size={14} color={ENTITY_COLORS[selectedEntityType]} />
              <Text style={[styles.filterPillText, { color: ENTITY_COLORS[selectedEntityType] }]}>
                {selectedEntityType}
              </Text>
            </View>
          )}
          {selectedAction && (
            <View style={[styles.filterPill, { backgroundColor: ACTION_ICONS[selectedAction].color + '20' }]}>
              <Ionicons name={ACTION_ICONS[selectedAction].name} size={14} color={ACTION_ICONS[selectedAction].color} />
              <Text style={[styles.filterPillText, { color: ACTION_ICONS[selectedAction].color }]}>
                {ACTION_LABELS[selectedAction]}
              </Text>
            </View>
          )}
          {startDate && (
            <View style={styles.filterPillDate}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.filterPillTextDate}>
                From: {format(startDate, 'MMM dd')}
              </Text>
            </View>
          )}
          {endDate && (
            <View style={styles.filterPillDate}>
              <Ionicons name="calendar" size={14} color="#666" />
              <Text style={styles.filterPillTextDate}>
                To: {format(endDate, 'MMM dd')}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Logs List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {logs.length === 0 ? (
          <Card>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No audit logs found</Text>
              {hasActiveFilters && (
                <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              )}
            </View>
          </Card>
        ) : (
          logs.map((log) => (
            <TouchableOpacity
              key={log.id}
              onPress={() => toggleExpand(log.id)}
              activeOpacity={0.7}
            >
              <Card style={expandedLogId === log.id ? styles.cardExpanded : undefined}>
                <View style={styles.logHeader}>
                  {/* Action Icon */}
                  <View style={[styles.actionIcon, { backgroundColor: ACTION_ICONS[log.action].color + '20' }]}>
                    <Ionicons 
                      name={ACTION_ICONS[log.action].name} 
                      size={20} 
                      color={ACTION_ICONS[log.action].color} 
                    />
                  </View>
                  
                  {/* Log Info */}
                  <View style={styles.logInfo}>
                    <View style={styles.logTitleRow}>
                      <Text style={styles.actionText}>
                        {ACTION_LABELS[log.action]}
                      </Text>
                      <View style={[styles.entityBadge, { backgroundColor: ENTITY_COLORS[log.entityType] + '20' }]}>
                        <Ionicons 
                          name={ENTITY_ICONS[log.entityType] || 'document'} 
                          size={12} 
                          color={ENTITY_COLORS[log.entityType] || '#666'} 
                        />
                        <Text style={[styles.entityBadgeText, { color: ENTITY_COLORS[log.entityType] || '#666' }]}>
                          {log.entityType}
                        </Text>
                      </View>
                    </View>
                    
                    {log.entityDisplayName && (
                      <Text style={styles.entityName} numberOfLines={1}>
                        {log.entityDisplayName}
                      </Text>
                    )}
                    
                    <View style={styles.logMeta}>
                      <Text style={styles.timestamp}>
                        {format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm')}
                      </Text>
                      <Text style={styles.userEmail} numberOfLines={1}>
                        by {log.userEmail}
                      </Text>
                    </View>
                    
                    {log.action === 'update' && log.changedFields && log.changedFields.length > 0 && (
                      <Text style={styles.changedFieldsPreview}>
                        {log.changedFields.length} field(s) changed
                      </Text>
                    )}
                  </View>
                  
                  {/* Expand Icon */}
                  <Ionicons 
                    name={expandedLogId === log.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color="#999" 
                  />
                </View>
                
                {/* Expanded Content */}
                {expandedLogId === log.id && renderExpandedContent(log)}
              </Card>
            </TouchableOpacity>
          ))
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
            <Text style={styles.modalTitle}>Filter Audit Logs</Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Entity Type Filter */}
              <Text style={styles.filterLabel}>Entity Type</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !selectedEntityType && styles.filterOptionSelected,
                  ]}
                  onPress={() => setSelectedEntityType(undefined)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !selectedEntityType && styles.filterOptionTextSelected,
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                {ENTITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.filterOption,
                      selectedEntityType === type && styles.filterOptionSelected,
                      { borderColor: ENTITY_COLORS[type] },
                    ]}
                    onPress={() => setSelectedEntityType(type)}
                  >
                    <Ionicons 
                      name={ENTITY_ICONS[type]} 
                      size={14} 
                      color={selectedEntityType === type ? '#fff' : ENTITY_COLORS[type]} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      selectedEntityType === type && styles.filterOptionTextSelected,
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Action Filter */}
              <Text style={styles.filterLabel}>Action</Text>
              <View style={styles.filterOptions}>
                <TouchableOpacity
                  style={[
                    styles.filterOption,
                    !selectedAction && styles.filterOptionSelected,
                  ]}
                  onPress={() => setSelectedAction(undefined)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    !selectedAction && styles.filterOptionTextSelected,
                  ]}>
                    All
                  </Text>
                </TouchableOpacity>
                {ACTIONS.map((action) => (
                  <TouchableOpacity
                    key={action}
                    style={[
                      styles.filterOption,
                      selectedAction === action && styles.filterOptionSelected,
                      { borderColor: ACTION_ICONS[action].color },
                    ]}
                    onPress={() => setSelectedAction(action)}
                  >
                    <Ionicons 
                      name={ACTION_ICONS[action].name} 
                      size={14} 
                      color={selectedAction === action ? '#fff' : ACTION_ICONS[action].color} 
                    />
                    <Text style={[
                      styles.filterOptionText,
                      selectedAction === action && styles.filterOptionTextSelected,
                    ]}>
                      {ACTION_LABELS[action]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Date Range */}
              <Text style={styles.filterLabel}>Date Range</Text>
              <View style={styles.dateRow}>
                <View style={styles.datePickerContainer}>
                  <DatePicker
                    label="From"
                    value={startDate}
                    onChange={setStartDate}
                    placeholder="Start date"
                    maximumDate={endDate || new Date()}
                  />
                </View>
                <View style={styles.datePickerContainer}>
                  <DatePicker
                    label="To"
                    value={endDate}
                    onChange={setEndDate}
                    placeholder="End date"
                    minimumDate={startDate || undefined}
                    maximumDate={new Date()}
                  />
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <Button title="Apply Filters" onPress={applyFilters} />
              <Button 
                title="Clear All" 
                onPress={clearFilters} 
                variant="secondary" 
              />
              <Button 
                title="Cancel" 
                onPress={() => setFilterModalVisible(false)} 
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
  filterBar: {
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
  resultCount: {
    marginLeft: 'auto',
    fontSize: 13,
    color: '#999',
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
    textTransform: 'capitalize',
  },
  filterPillDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  filterPillTextDate: {
    fontSize: 12,
    color: '#666',
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 4,
  },
  cardExpanded: {
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  logHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  entityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  entityBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  entityName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginBottom: 4,
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  changedFieldsPreview: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  changedFieldsContainer: {
    marginBottom: 16,
  },
  changedFieldsLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  changedFieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  changedFieldBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  changedFieldText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  valueSection: {
    marginBottom: 16,
  },
  valueSectionTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  jsonContainer: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    minWidth: '100%',
  },
  jsonText: {
    fontSize: 11,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  notesSection: {
    marginTop: 8,
  },
  notesSectionTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 13,
    color: '#333',
    fontStyle: 'italic',
  },
  // Modal styles
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
    textTransform: 'capitalize',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  datePickerContainer: {
    flex: 1,
  },
  modalButtons: {
    marginTop: 20,
    gap: 8,
  },
});

