// Firebase CRUD operations for Institutional Documents
import { db } from './firebaseConfig';
import { InstitutionalDocument, DocumentType, ProtocolCategory, DocumentStatus } from '../types';

// Collection name
const DOCUMENTS_COLLECTION = 'institutionalDocuments';

// ==================== CREATE ====================

export const createDocument = async (
  documentData: Omit<InstitutionalDocument, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  if (!documentData.userId) {
    throw new Error('userId is required to create a document');
  }

  const now = Date.now();
  const docRef = await db.collection(DOCUMENTS_COLLECTION).add({
    ...documentData,
    createdAt: now,
    updatedAt: now,
  });

  console.log('[Documents] Created document with ID:', docRef.id);
  return docRef.id;
};

// ==================== READ ====================

export const getDocument = async (documentId: string): Promise<InstitutionalDocument | null> => {
  console.log('[Documents] Getting document with ID:', documentId);
  const docSnap = await db.collection(DOCUMENTS_COLLECTION).doc(documentId).get();

  if (docSnap.exists) {
    const document = { id: docSnap.id, ...docSnap.data() } as InstitutionalDocument;
    console.log('[Documents] Document found:', document.title);
    return document;
  }
  console.log('[Documents] Document not found');
  return null;
};

export const getUserDocuments = async (userId: string): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] getUserDocuments called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    // If index not ready, query without orderBy
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[Documents] Index not ready, querying without orderBy');
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    throw error;
  }
};

export const getDocumentsByType = async (
  userId: string,
  documentType: DocumentType
): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] getDocumentsByType called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .where('documentType', '==', documentType)
      .orderBy('updatedAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('documentType', '==', documentType)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    throw error;
  }
};

export const getDocumentsByCategory = async (
  userId: string,
  category: ProtocolCategory
): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] getDocumentsByCategory called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .where('category', '==', category)
      .orderBy('updatedAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('category', '==', category)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    throw error;
  }
};

export const getDocumentsByStatus = async (
  userId: string,
  status: DocumentStatus
): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] getDocumentsByStatus called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .where('status', '==', status)
      .orderBy('updatedAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('status', '==', status)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => b.updatedAt - a.updatedAt);
    }
    throw error;
  }
};

export const getActiveProtocols = async (userId: string): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] getActiveProtocols called with undefined/null userId');
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .where('documentType', '==', 'protocol')
      .where('status', '==', 'active')
      .orderBy('category', 'asc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('documentType', '==', 'protocol')
        .where('status', '==', 'active')
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
    }
    throw error;
  }
};

export interface DocumentFilters {
  documentType?: DocumentType;
  category?: ProtocolCategory;
  status?: DocumentStatus;
}

export const searchDocuments = async (
  userId: string,
  filters: DocumentFilters
): Promise<InstitutionalDocument[]> => {
  if (!userId) {
    console.warn('[Documents] searchDocuments called with undefined/null userId');
    return [];
  }

  // Get all user documents and filter in memory for flexibility
  const allDocs = await getUserDocuments(userId);

  return allDocs.filter(doc => {
    if (filters.documentType && doc.documentType !== filters.documentType) return false;
    if (filters.category && doc.category !== filters.category) return false;
    if (filters.status && doc.status !== filters.status) return false;
    return true;
  });
};

// ==================== UPDATE ====================

export const updateDocument = async (
  documentId: string,
  data: Partial<InstitutionalDocument>
): Promise<void> => {
  await db.collection(DOCUMENTS_COLLECTION).doc(documentId).update({
    ...data,
    updatedAt: Date.now(),
  });
  console.log('[Documents] Updated document:', documentId);
};

export const archiveDocument = async (documentId: string): Promise<void> => {
  await db.collection(DOCUMENTS_COLLECTION).doc(documentId).update({
    status: 'archived',
    updatedAt: Date.now(),
  });
  console.log('[Documents] Archived document:', documentId);
};

export const activateDocument = async (documentId: string): Promise<void> => {
  await db.collection(DOCUMENTS_COLLECTION).doc(documentId).update({
    status: 'active',
    updatedAt: Date.now(),
  });
  console.log('[Documents] Activated document:', documentId);
};

// ==================== DELETE ====================

export const deleteDocument = async (documentId: string): Promise<void> => {
  await db.collection(DOCUMENTS_COLLECTION).doc(documentId).delete();
  console.log('[Documents] Deleted document:', documentId);
};

// ==================== VERSION MANAGEMENT ====================

/**
 * Get all versions of a document by title (for version history)
 */
export const getDocumentVersions = async (
  userId: string,
  title: string
): Promise<InstitutionalDocument[]> => {
  if (!userId || !title) {
    return [];
  }

  try {
    const querySnapshot = await db
      .collection(DOCUMENTS_COLLECTION)
      .where('userId', '==', userId)
      .where('title', '==', title)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InstitutionalDocument));
  } catch (error: any) {
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      const querySnapshot = await db
        .collection(DOCUMENTS_COLLECTION)
        .where('userId', '==', userId)
        .where('title', '==', title)
        .get();

      const docs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as InstitutionalDocument));

      return docs.sort((a, b) => b.createdAt - a.createdAt);
    }
    throw error;
  }
};

/**
 * Create a new version of an existing document
 */
export const createNewVersion = async (
  existingDocument: InstitutionalDocument,
  newVersion: string,
  updates: Partial<Omit<InstitutionalDocument, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<string> => {
  // Archive the old version
  await archiveDocument(existingDocument.id);

  // Create new version
  const now = Date.now();
  const newDocData = {
    userId: existingDocument.userId,
    documentType: existingDocument.documentType,
    category: existingDocument.category,
    title: existingDocument.title,
    version: newVersion,
    content: existingDocument.content,
    fileUrl: existingDocument.fileUrl,
    effectiveDate: existingDocument.effectiveDate,
    expirationDate: existingDocument.expirationDate,
    approvedBy: existingDocument.approvedBy,
    status: 'active' as DocumentStatus,
    ...updates,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await db.collection(DOCUMENTS_COLLECTION).add(newDocData);
  console.log('[Documents] Created new version:', newVersion, 'ID:', docRef.id);
  return docRef.id;
};






