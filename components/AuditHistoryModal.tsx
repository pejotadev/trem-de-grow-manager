import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { getEntityAuditLogs } from '../firebase/auditLog';
import { AuditLog, AuditAction } from '../types';
import { Button } from './Button';
import { Loading } from './Loading';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

interface AuditHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityDisplayName?: string;
}

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

export const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({
  visible,
  onClose,
  entityType,
  entityId,
  entityDisplayName,
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && entityId) {
      loadLogs();
    }
  }, [visible, entityId, entityType]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const logsData = await getEntityAuditLogs(entityType, entityId);
      setLogs(logsData);
    } catch (error) {
      console.error('[AuditHistoryModal] Error loading logs:', error);
    } finally {
      setLoading(false);
    }
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

  const renderFieldDiff = (log: AuditLog) => {
    if (log.action !== 'update' || !log.changedFields || log.changedFields.length === 0) {
      return null;
    }

    const previousValue = parseJsonSafe(log.previousValue);
    const newValue = parseJsonSafe(log.newValue);

    if (!previousValue || !newValue) return null;

    return (
      <View style={styles.diffContainer}>
        {log.changedFields.map((field, index) => {
          const prevVal = previousValue[field];
          const newVal = newValue[field];
          
          return (
            <View key={index} style={styles.diffRow}>
              <Text style={styles.diffFieldName}>{field}:</Text>
              <View style={styles.diffValues}>
                <View style={styles.diffOld}>
                  <Text style={styles.diffLabel}>Before:</Text>
                  <Text style={styles.diffOldText} numberOfLines={2}>
                    {typeof prevVal === 'object' ? JSON.stringify(prevVal) : String(prevVal ?? '(empty)')}
                  </Text>
                </View>
                <Ionicons name="arrow-forward" size={14} color="#999" />
                <View style={styles.diffNew}>
                  <Text style={styles.diffLabel}>After:</Text>
                  <Text style={styles.diffNewText} numberOfLines={2}>
                    {typeof newVal === 'object' ? JSON.stringify(newVal) : String(newVal ?? '(empty)')}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderExpandedContent = (log: AuditLog) => {
    const previousValue = parseJsonSafe(log.previousValue);
    const newValue = parseJsonSafe(log.newValue);
    
    return (
      <View style={styles.expandedContent}>
        {log.action === 'update' && renderFieldDiff(log)}
        
        {log.action === 'create' && newValue && (
          <View style={styles.valueSection}>
            <Text style={styles.valueSectionTitle}>Created with:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(newValue, null, 2)}
                </Text>
              </View>
            </ScrollView>
          </View>
        )}
        
        {log.action === 'delete' && previousValue && (
          <View style={styles.valueSection}>
            <Text style={styles.valueSectionTitle}>Deleted data:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.jsonContainer}>
                <Text style={styles.jsonText}>
                  {JSON.stringify(previousValue, null, 2)}
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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Ionicons name="time" size={24} color="#4CAF50" />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.modalTitle}>Change History</Text>
              {entityDisplayName && (
                <Text style={styles.entityName} numberOfLines={1}>
                  {entityDisplayName}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <Loading message="Loading history..." />
            </View>
          ) : logs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No history found</Text>
              <Text style={styles.emptySubtext}>
                Changes to this {entityType} will appear here
              </Text>
            </View>
          ) : (
            <ScrollView 
              style={styles.logsList}
              showsVerticalScrollIndicator={false}
            >
              {/* Timeline */}
              {logs.map((log, index) => (
                <TouchableOpacity
                  key={log.id}
                  onPress={() => toggleExpand(log.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.timelineItem}>
                    {/* Timeline line */}
                    {index < logs.length - 1 && (
                      <View style={styles.timelineLine} />
                    )}
                    
                    {/* Timeline dot */}
                    <View style={[
                      styles.timelineDot,
                      { backgroundColor: ACTION_ICONS[log.action].color }
                    ]}>
                      <Ionicons 
                        name={ACTION_ICONS[log.action].name} 
                        size={14} 
                        color="#fff" 
                      />
                    </View>
                    
                    {/* Content */}
                    <View style={[
                      styles.logCard,
                      expandedLogId === log.id && styles.logCardExpanded
                    ]}>
                      <View style={styles.logHeader}>
                        <Text style={styles.actionText}>
                          {ACTION_LABELS[log.action]}
                        </Text>
                        <Ionicons 
                          name={expandedLogId === log.id ? 'chevron-up' : 'chevron-down'} 
                          size={16} 
                          color="#999" 
                        />
                      </View>
                      
                      <Text style={styles.timestamp}>
                        {format(new Date(log.timestamp), 'MMM dd, yyyy \'at\' HH:mm')}
                      </Text>
                      
                      <Text style={styles.userEmail} numberOfLines={1}>
                        by {log.userEmail}
                      </Text>
                      
                      {log.action === 'update' && log.changedFields && log.changedFields.length > 0 && (
                        <View style={styles.changedFieldsPreview}>
                          <Text style={styles.changedFieldsPreviewText}>
                            {log.changedFields.slice(0, 3).join(', ')}
                            {log.changedFields.length > 3 && ` +${log.changedFields.length - 3} more`}
                          </Text>
                        </View>
                      )}
                      
                      {expandedLogId === log.id && renderExpandedContent(log)}
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.footer}>
            <Button title="Close" onPress={onClose} variant="secondary" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e8f5e9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  entityName: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#ccc',
    marginTop: 4,
    textAlign: 'center',
  },
  logsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 16,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 13,
    top: 28,
    bottom: -16,
    width: 2,
    backgroundColor: '#e0e0e0',
  },
  timelineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 1,
  },
  logCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
  },
  logCardExpanded: {
    backgroundColor: '#f0f8f0',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
    color: '#666',
  },
  changedFieldsPreview: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  changedFieldsPreviewText: {
    fontSize: 11,
    color: '#2196F3',
    fontStyle: 'italic',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  changedFieldsContainer: {
    marginBottom: 12,
  },
  changedFieldsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  changedFieldsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  changedFieldBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  changedFieldText: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '500',
  },
  diffContainer: {
    gap: 12,
  },
  diffRow: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
  },
  diffFieldName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  diffValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  diffOld: {
    flex: 1,
  },
  diffNew: {
    flex: 1,
  },
  diffLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  diffOldText: {
    fontSize: 11,
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    padding: 6,
    borderRadius: 4,
  },
  diffNewText: {
    fontSize: 11,
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    padding: 6,
    borderRadius: 4,
  },
  valueSection: {
    marginBottom: 12,
  },
  valueSectionTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  jsonContainer: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
    minWidth: '100%',
  },
  jsonText: {
    fontSize: 10,
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  notesSection: {
    marginTop: 8,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 6,
  },
  notesSectionTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },
  notesText: {
    fontSize: 12,
    color: '#333',
    fontStyle: 'italic',
  },
  footer: {
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
});




