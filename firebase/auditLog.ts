// Audit Logging System for tracking all data changes
import { db } from './firebaseConfig';
import { AuditLog, AuditAction } from '../types';

// Collection name for audit logs
const AUDIT_LOG_COLLECTION = 'auditLogs';

/**
 * Compares two objects and returns the list of changed field names
 */
const getChangedFields = (previousData: any, newData: any): string[] => {
  const changedFields: string[] = [];
  const allKeys = new Set([...Object.keys(previousData || {}), ...Object.keys(newData || {})]);
  
  for (const key of allKeys) {
    const prevValue = previousData?.[key];
    const newValue = newData?.[key];
    
    // Skip internal/meta fields
    if (key === 'id' || key === 'createdAt' || key === 'updatedAt') continue;
    
    // Compare values (stringify for object comparison)
    const prevStr = JSON.stringify(prevValue);
    const newStr = JSON.stringify(newValue);
    
    if (prevStr !== newStr) {
      changedFields.push(key);
    }
  }
  
  return changedFields;
};

/**
 * Safely stringify data for storage, handling undefined and circular references
 */
const safeStringify = (data: any): string | undefined => {
  if (data === undefined || data === null) return undefined;
  try {
    return JSON.stringify(data);
  } catch {
    return '[Unable to serialize]';
  }
};

// ==================== LOGGING FUNCTIONS ====================

/**
 * Log a create action
 */
export const logCreate = async (
  userId: string,
  userEmail: string,
  entityType: string,
  entityId: string,
  entityDisplayName: string | undefined,
  data: any,
  notes?: string
): Promise<void> => {
  try {
    const auditData: Omit<AuditLog, 'id'> = {
      userId,
      userEmail,
      action: 'create',
      entityType,
      entityId,
      entityDisplayName,
      newValue: safeStringify(data),
      timestamp: Date.now(),
      notes,
    };
    
    await db.collection(AUDIT_LOG_COLLECTION).add(auditData);
    console.log(`[AuditLog] Created: ${entityType}/${entityId}`);
  } catch (error) {
    console.error('[AuditLog] Error logging create:', error);
    // Don't throw - audit logging should not break the main operation
  }
};

/**
 * Log an update action
 */
export const logUpdate = async (
  userId: string,
  userEmail: string,
  entityType: string,
  entityId: string,
  entityDisplayName: string | undefined,
  previousData: any,
  newData: any,
  notes?: string
): Promise<void> => {
  try {
    const changedFields = getChangedFields(previousData, newData);
    
    // Don't log if nothing actually changed
    if (changedFields.length === 0) {
      console.log(`[AuditLog] Skipped update (no changes): ${entityType}/${entityId}`);
      return;
    }
    
    const auditData: Omit<AuditLog, 'id'> = {
      userId,
      userEmail,
      action: 'update',
      entityType,
      entityId,
      entityDisplayName,
      previousValue: safeStringify(previousData),
      newValue: safeStringify(newData),
      changedFields,
      timestamp: Date.now(),
      notes,
    };
    
    await db.collection(AUDIT_LOG_COLLECTION).add(auditData);
    console.log(`[AuditLog] Updated: ${entityType}/${entityId}, fields: ${changedFields.join(', ')}`);
  } catch (error) {
    console.error('[AuditLog] Error logging update:', error);
    // Don't throw - audit logging should not break the main operation
  }
};

/**
 * Log a delete action
 */
export const logDelete = async (
  userId: string,
  userEmail: string,
  entityType: string,
  entityId: string,
  entityDisplayName: string | undefined,
  deletedData: any,
  notes?: string
): Promise<void> => {
  try {
    const auditData: Omit<AuditLog, 'id'> = {
      userId,
      userEmail,
      action: 'delete',
      entityType,
      entityId,
      entityDisplayName,
      previousValue: safeStringify(deletedData),
      timestamp: Date.now(),
      notes,
    };
    
    await db.collection(AUDIT_LOG_COLLECTION).add(auditData);
    console.log(`[AuditLog] Deleted: ${entityType}/${entityId}`);
  } catch (error) {
    console.error('[AuditLog] Error logging delete:', error);
    // Don't throw - audit logging should not break the main operation
  }
};

// ==================== QUERY FUNCTIONS ====================

/**
 * Get audit logs for a specific entity
 */
export const getEntityAuditLogs = async (
  entityType: string,
  entityId: string
): Promise<AuditLog[]> => {
  try {
    const querySnapshot = await db
      .collection(AUDIT_LOG_COLLECTION)
      .where('entityType', '==', entityType)
      .where('entityId', '==', entityId)
      .orderBy('timestamp', 'desc')
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  } catch (error: any) {
    console.error('[AuditLog] Error getting entity logs:', error);
    // If index not ready, fall back to unordered query
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(AUDIT_LOG_COLLECTION)
        .where('entityType', '==', entityType)
        .where('entityId', '==', entityId)
        .get();
      
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
      
      return logs.sort((a, b) => b.timestamp - a.timestamp);
    }
    throw error;
  }
};

/**
 * Get audit logs for a specific user
 */
export const getUserAuditLogs = async (
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> => {
  try {
    const querySnapshot = await db
      .collection(AUDIT_LOG_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  } catch (error: any) {
    console.error('[AuditLog] Error getting user logs:', error);
    // If index not ready, fall back to unordered query
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(AUDIT_LOG_COLLECTION)
        .where('userId', '==', userId)
        .get();
      
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
      
      return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    throw error;
  }
};

/**
 * Get recent audit logs (across all users)
 */
export const getRecentAuditLogs = async (limit: number = 50): Promise<AuditLog[]> => {
  try {
    const querySnapshot = await db
      .collection(AUDIT_LOG_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  } catch (error) {
    console.error('[AuditLog] Error getting recent logs:', error);
    throw error;
  }
};

/**
 * Search audit logs with filters
 */
export interface AuditLogFilters {
  userId?: string;
  entityType?: string;
  action?: AuditAction;
  startDate?: number;
  endDate?: number;
  limit?: number;
}

export const searchAuditLogs = async (filters: AuditLogFilters): Promise<AuditLog[]> => {
  try {
    let query: any = db.collection(AUDIT_LOG_COLLECTION);
    
    // Apply filters (Firestore allows only one inequality filter per query)
    if (filters.userId) {
      query = query.where('userId', '==', filters.userId);
    }
    if (filters.entityType) {
      query = query.where('entityType', '==', filters.entityType);
    }
    if (filters.action) {
      query = query.where('action', '==', filters.action);
    }
    
    // Add ordering and limit
    query = query.orderBy('timestamp', 'desc');
    
    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(100); // Default limit
    }
    
    const querySnapshot = await query.get();
    
    let logs = querySnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
    
    // Apply date filters in memory (to avoid needing a composite index)
    if (filters.startDate) {
      logs = logs.filter(log => log.timestamp >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(log => log.timestamp <= filters.endDate!);
    }
    
    return logs;
  } catch (error: any) {
    console.error('[AuditLog] Error searching logs:', error);
    
    // If index not ready, try simpler query
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[AuditLog] Index not ready, using simpler query');
      
      let query: any = db.collection(AUDIT_LOG_COLLECTION);
      
      // Use just one filter if possible
      if (filters.userId) {
        query = query.where('userId', '==', filters.userId);
      } else if (filters.entityType) {
        query = query.where('entityType', '==', filters.entityType);
      } else if (filters.action) {
        query = query.where('action', '==', filters.action);
      }
      
      const querySnapshot = await query.get();
      
      let logs = querySnapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
      
      // Apply remaining filters in memory
      if (filters.userId && query !== db.collection(AUDIT_LOG_COLLECTION).where('userId', '==', filters.userId)) {
        logs = logs.filter(log => log.userId === filters.userId);
      }
      if (filters.entityType) {
        logs = logs.filter(log => log.entityType === filters.entityType);
      }
      if (filters.action) {
        logs = logs.filter(log => log.action === filters.action);
      }
      if (filters.startDate) {
        logs = logs.filter(log => log.timestamp >= filters.startDate!);
      }
      if (filters.endDate) {
        logs = logs.filter(log => log.timestamp <= filters.endDate!);
      }
      
      // Sort and limit
      logs = logs.sort((a, b) => b.timestamp - a.timestamp);
      if (filters.limit) {
        logs = logs.slice(0, filters.limit);
      }
      
      return logs;
    }
    
    throw error;
  }
};

/**
 * Get audit logs for multiple entity types (useful for dashboard)
 */
export const getAuditLogsByEntityTypes = async (
  entityTypes: string[],
  limit: number = 50
): Promise<AuditLog[]> => {
  try {
    const querySnapshot = await db
      .collection(AUDIT_LOG_COLLECTION)
      .where('entityType', 'in', entityTypes)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog));
  } catch (error: any) {
    console.error('[AuditLog] Error getting logs by entity types:', error);
    // If index not ready, fall back to getting all and filtering
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(AUDIT_LOG_COLLECTION)
        .where('entityType', 'in', entityTypes)
        .get();
      
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AuditLog));
      
      return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
    }
    throw error;
  }
};



