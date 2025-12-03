// Firebase CRUD operations for Waste Disposal Tracking
import { db } from './firebaseConfig';
import { WasteDisposal, WasteMaterialType, DisposalMethod } from '../types';

// Collection name
const WASTE_COLLECTION = 'wasteDisposals';

// ==================== CREATE ====================

export const createWasteDisposal = async (
  disposalData: Omit<WasteDisposal, 'id' | 'createdAt'>
): Promise<string> => {
  if (!disposalData.userId) {
    throw new Error('userId is required to create a waste disposal record');
  }

  const docRef = await db.collection(WASTE_COLLECTION).add({
    ...disposalData,
    createdAt: Date.now(),
  });

  console.log('[WasteDisposal] Created record with ID:', docRef.id);
  return docRef.id;
};

// ==================== READ ====================

export const getWasteDisposal = async (disposalId: string): Promise<WasteDisposal | null> => {
  console.log('[WasteDisposal] Getting record with ID:', disposalId);
  const docSnap = await db.collection(WASTE_COLLECTION).doc(disposalId).get();

  if (docSnap.exists) {
    const disposal = { id: docSnap.id, ...docSnap.data() } as WasteDisposal;
    console.log('[WasteDisposal] Record found');
    return disposal;
  }
  console.log('[WasteDisposal] Record not found');
  return null;
};

export const getUserWasteDisposals = async (userId: string): Promise<WasteDisposal[]> => {
  if (!userId) {
    console.warn('[WasteDisposal] getUserWasteDisposals called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(WASTE_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('disposalDate', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WasteDisposal));
  } catch (error: any) {
    // If index not ready, query without orderBy
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[WasteDisposal] Index not ready, querying without orderBy');
      const querySnapshot = await db
        .collection(WASTE_COLLECTION)
        .where('userId', '==', userId)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WasteDisposal));

      return docs.sort((a, b) => b.disposalDate - a.disposalDate);
    }
    throw error;
  }
};

export const getWasteDisposalsByMaterialType = async (
  userId: string,
  materialType: WasteMaterialType
): Promise<WasteDisposal[]> => {
  if (!userId) {
    console.warn('[WasteDisposal] getWasteDisposalsByMaterialType called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(WASTE_COLLECTION)
      .where('userId', '==', userId)
      .where('materialType', '==', materialType)
      .orderBy('disposalDate', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WasteDisposal));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(WASTE_COLLECTION)
        .where('userId', '==', userId)
        .where('materialType', '==', materialType)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WasteDisposal));

      return docs.sort((a, b) => b.disposalDate - a.disposalDate);
    }
    throw error;
  }
};

export const getWasteDisposalsByDateRange = async (
  userId: string,
  startDate: number,
  endDate: number
): Promise<WasteDisposal[]> => {
  if (!userId) {
    console.warn('[WasteDisposal] getWasteDisposalsByDateRange called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(WASTE_COLLECTION)
      .where('userId', '==', userId)
      .where('disposalDate', '>=', startDate)
      .where('disposalDate', '<=', endDate)
      .orderBy('disposalDate', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WasteDisposal));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(WASTE_COLLECTION)
        .where('userId', '==', userId)
        .get();

      const docs = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as WasteDisposal))
        .filter(d => d.disposalDate >= startDate && d.disposalDate <= endDate);

      return docs.sort((a, b) => b.disposalDate - a.disposalDate);
    }
    throw error;
  }
};

export const getWasteDisposalsBySource = async (
  userId: string,
  sourceEntityType: 'plant' | 'harvest' | 'extract',
  sourceEntityId: string
): Promise<WasteDisposal[]> => {
  if (!userId || !sourceEntityId) {
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(WASTE_COLLECTION)
      .where('userId', '==', userId)
      .where('sourceEntityType', '==', sourceEntityType)
      .where('sourceEntityId', '==', sourceEntityId)
      .orderBy('disposalDate', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as WasteDisposal));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(WASTE_COLLECTION)
        .where('userId', '==', userId)
        .where('sourceEntityType', '==', sourceEntityType)
        .where('sourceEntityId', '==', sourceEntityId)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as WasteDisposal));

      return docs.sort((a, b) => b.disposalDate - a.disposalDate);
    }
    throw error;
  }
};

export interface WasteFilters {
  materialType?: WasteMaterialType;
  disposalMethod?: DisposalMethod;
  startDate?: number;
  endDate?: number;
}

export const searchWasteDisposals = async (
  userId: string,
  filters: WasteFilters
): Promise<WasteDisposal[]> => {
  if (!userId) {
    console.warn('[WasteDisposal] searchWasteDisposals called with undefined/null userId');
    return [];
  }

  // Get all user disposals and filter in memory for flexibility
  const allDisposals = await getUserWasteDisposals(userId);

  return allDisposals.filter(disposal => {
    if (filters.materialType && disposal.materialType !== filters.materialType) return false;
    if (filters.disposalMethod && disposal.disposalMethod !== filters.disposalMethod) return false;
    if (filters.startDate && disposal.disposalDate < filters.startDate) return false;
    if (filters.endDate && disposal.disposalDate > filters.endDate) return false;
    return true;
  });
};

// ==================== STATISTICS ====================

export const getWasteDisposalStats = async (
  userId: string,
  startDate?: number,
  endDate?: number
): Promise<{
  totalRecords: number;
  totalWeightGrams: number;
  byMaterialType: Record<WasteMaterialType, { count: number; weightGrams: number }>;
  byMethod: Record<DisposalMethod, { count: number; weightGrams: number }>;
}> => {
  let disposals: WasteDisposal[];

  if (startDate && endDate) {
    disposals = await getWasteDisposalsByDateRange(userId, startDate, endDate);
  } else {
    disposals = await getUserWasteDisposals(userId);
  }

  const stats = {
    totalRecords: disposals.length,
    totalWeightGrams: 0,
    byMaterialType: {} as Record<WasteMaterialType, { count: number; weightGrams: number }>,
    byMethod: {} as Record<DisposalMethod, { count: number; weightGrams: number }>,
  };

  for (const disposal of disposals) {
    stats.totalWeightGrams += disposal.quantityGrams;

    // By material type
    if (!stats.byMaterialType[disposal.materialType]) {
      stats.byMaterialType[disposal.materialType] = { count: 0, weightGrams: 0 };
    }
    stats.byMaterialType[disposal.materialType].count++;
    stats.byMaterialType[disposal.materialType].weightGrams += disposal.quantityGrams;

    // By method
    if (!stats.byMethod[disposal.disposalMethod]) {
      stats.byMethod[disposal.disposalMethod] = { count: 0, weightGrams: 0 };
    }
    stats.byMethod[disposal.disposalMethod].count++;
    stats.byMethod[disposal.disposalMethod].weightGrams += disposal.quantityGrams;
  }

  return stats;
};

// ==================== UPDATE ====================

export const updateWasteDisposal = async (
  disposalId: string,
  data: Partial<WasteDisposal>
): Promise<void> => {
  await db.collection(WASTE_COLLECTION).doc(disposalId).update(data);
  console.log('[WasteDisposal] Updated record:', disposalId);
};

// ==================== DELETE ====================

export const deleteWasteDisposal = async (disposalId: string): Promise<void> => {
  await db.collection(WASTE_COLLECTION).doc(disposalId).delete();
  console.log('[WasteDisposal] Deleted record:', disposalId);
};




