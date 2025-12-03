// Firebase CRUD operations for Associations and Members
import { db } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { 
  Association, 
  AssociationStatus, 
  Member, 
  MemberRole, 
  AssociationInvitation,
  InvitationStatus 
} from '../types';

// Collection names
const ASSOCIATIONS_COLLECTION = 'associations';
const MEMBERS_COLLECTION = 'members';
const INVITATIONS_COLLECTION = 'associationInvitations';

// ==================== UTILITIES ====================

/**
 * Removes undefined values from an object.
 * Firebase doesn't accept undefined values in update operations.
 */
const removeUndefinedValues = <T extends Record<string, any>>(obj: T): Partial<T> => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
};

// ==================== ASSOCIATIONS ====================

/**
 * Creates a new association and makes the creator the owner
 */
export const createAssociation = async (
  associationData: Omit<Association, 'id' | 'createdAt' | 'updatedAt' | 'plantCounter' | 'harvestCounter' | 'extractCounter' | 'distributionCounter' | 'orderCounter' | 'patientCounter'>,
  creatorUserId: string,
  creatorEmail: string,
  creatorDisplayName?: string
): Promise<{ associationId: string; memberId: string }> => {
  if (!creatorUserId) {
    throw new Error('creatorUserId is required to create an association');
  }
  
  const now = Date.now();
  
  // Create the association with initialized counters
  const associationDoc: Omit<Association, 'id'> = {
    ...associationData,
    plantCounter: 0,
    harvestCounter: 0,
    extractCounter: 0,
    distributionCounter: 0,
    orderCounter: 0,
    patientCounter: 0,
    createdAt: now,
    updatedAt: now,
    createdBy: creatorUserId,
  };

  const associationRef = await db.collection(ASSOCIATIONS_COLLECTION).add(associationDoc);
  const associationId = associationRef.id;

  console.log('[Associations] Created association with ID:', associationId);

  // Create the owner membership for the creator
  const memberData: Omit<Member, 'id'> = {
    associationId,
    userId: creatorUserId,
    userEmail: creatorEmail,
    displayName: creatorDisplayName,
    role: 'owner',
    fullName: associationData.responsiblePersonName,
    documentType: 'cpf',
    documentNumber: associationData.responsiblePersonCpf,
    joinDate: now,
    isActive: true,
    // Owner has all permissions
    canManagePatients: true,
    canManagePlants: true,
    canManageHarvests: true,
    canManageDistributions: true,
    canManageMembers: true,
    canViewReports: true,
    canExportData: true,
    createdAt: now,
    updatedAt: now,
  };

  const memberRef = await db.collection(MEMBERS_COLLECTION).add(removeUndefinedValues(memberData));
  
  console.log('[Associations] Created owner member with ID:', memberRef.id);

  // Update the user's document to include this association
  await db.collection('users').doc(creatorUserId).set({
    currentAssociationId: associationId,
    associationIds: firebase.firestore.FieldValue.arrayUnion(associationId),
  }, { merge: true });

  return { associationId, memberId: memberRef.id };
};

/**
 * Gets an association by ID
 */
export const getAssociation = async (associationId: string): Promise<Association | null> => {
  console.log('[Associations] Getting association with ID:', associationId);
  const docSnap = await db.collection(ASSOCIATIONS_COLLECTION).doc(associationId).get();
  
  if (docSnap.exists) {
    const association = { id: docSnap.id, ...docSnap.data() } as Association;
    console.log('[Associations] Association found:', association.name);
    return association;
  }
  console.log('[Associations] Association not found');
  return null;
};

/**
 * Gets all associations for a user
 */
export const getUserAssociations = async (userId: string): Promise<Association[]> => {
  if (!userId) {
    console.warn('[Associations] getUserAssociations called with undefined/null userId');
    return [];
  }

  // First get the user's association IDs
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return [];
  }

  const userData = userDoc.data();
  const associationIds = userData?.associationIds || [];

  if (associationIds.length === 0) {
    return [];
  }

  // Fetch all associations (Firestore limits 'in' queries to 10 items)
  const associations: Association[] = [];
  
  // Split into batches of 10
  for (let i = 0; i < associationIds.length; i += 10) {
    const batch = associationIds.slice(i, i + 10);
    const querySnapshot = await db
      .collection(ASSOCIATIONS_COLLECTION)
      .where(firebase.firestore.FieldPath.documentId(), 'in', batch)
      .get();
    
    querySnapshot.docs.forEach(doc => {
      associations.push({ id: doc.id, ...doc.data() } as Association);
    });
  }

  return associations.sort((a, b) => b.createdAt - a.createdAt);
};

/**
 * Updates an association
 */
export const updateAssociation = async (
  associationId: string, 
  data: Partial<Association>
): Promise<void> => {
  await db.collection(ASSOCIATIONS_COLLECTION).doc(associationId).update({
    ...removeUndefinedValues(data),
    updatedAt: Date.now(),
  });
  console.log('[Associations] Updated association:', associationId);
};

/**
 * Updates association status
 */
export const updateAssociationStatus = async (
  associationId: string, 
  status: AssociationStatus
): Promise<void> => {
  await db.collection(ASSOCIATIONS_COLLECTION).doc(associationId).update({
    status,
    updatedAt: Date.now(),
  });
  console.log('[Associations] Updated association status to:', status);
};

/**
 * Deletes an association and all related data
 * Warning: This is a destructive operation
 */
export const deleteAssociation = async (associationId: string): Promise<void> => {
  // First, remove all members
  const membersSnapshot = await db
    .collection(MEMBERS_COLLECTION)
    .where('associationId', '==', associationId)
    .get();
  
  const memberDeletePromises = membersSnapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(memberDeletePromises);

  // Remove pending invitations
  const invitationsSnapshot = await db
    .collection(INVITATIONS_COLLECTION)
    .where('associationId', '==', associationId)
    .get();
  
  const invitationDeletePromises = invitationsSnapshot.docs.map(doc => doc.ref.delete());
  await Promise.all(invitationDeletePromises);

  // Delete the association
  await db.collection(ASSOCIATIONS_COLLECTION).doc(associationId).delete();
  
  console.log('[Associations] Deleted association:', associationId);
};

/**
 * Increment a counter on the association (for control numbers)
 */
export const incrementAssociationCounter = async (
  associationId: string,
  counterField: 'plantCounter' | 'harvestCounter' | 'extractCounter' | 'distributionCounter' | 'orderCounter' | 'patientCounter'
): Promise<number> => {
  const associationRef = db.collection(ASSOCIATIONS_COLLECTION).doc(associationId);
  
  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(associationRef);
    
    if (!doc.exists) {
      throw new Error('Association not found');
    }
    
    const currentCount = doc.data()?.[counterField] || 0;
    const newCount = currentCount + 1;
    
    transaction.update(associationRef, {
      [counterField]: newCount,
      updatedAt: Date.now(),
    });
    
    return newCount;
  });
};

// ==================== MEMBERS ====================

/**
 * Gets a member by ID
 */
export const getMember = async (memberId: string): Promise<Member | null> => {
  const docSnap = await db.collection(MEMBERS_COLLECTION).doc(memberId).get();
  
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as Member;
  }
  return null;
};

/**
 * Gets a member by userId and associationId
 */
export const getMemberByUserId = async (
  userId: string, 
  associationId: string
): Promise<Member | null> => {
  const querySnapshot = await db
    .collection(MEMBERS_COLLECTION)
    .where('userId', '==', userId)
    .where('associationId', '==', associationId)
    .limit(1)
    .get();
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Member;
};

/**
 * Gets all members of an association
 */
export const getAssociationMembers = async (
  associationId: string,
  activeOnly: boolean = true
): Promise<Member[]> => {
  if (!associationId) {
    console.warn('[Associations] getAssociationMembers called with undefined/null associationId');
    return [];
  }

  let query = db
    .collection(MEMBERS_COLLECTION)
    .where('associationId', '==', associationId);
  
  if (activeOnly) {
    query = query.where('isActive', '==', true);
  }

  const querySnapshot = await query.orderBy('joinDate', 'desc').get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Member));
};

/**
 * Gets members by role
 */
export const getMembersByRole = async (
  associationId: string,
  role: MemberRole
): Promise<Member[]> => {
  const querySnapshot = await db
    .collection(MEMBERS_COLLECTION)
    .where('associationId', '==', associationId)
    .where('role', '==', role)
    .where('isActive', '==', true)
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Member));
};

/**
 * Adds a new member to an association
 */
export const addMember = async (
  memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  if (!memberData.associationId) {
    throw new Error('associationId is required to add a member');
  }
  if (!memberData.userId) {
    throw new Error('userId is required to add a member');
  }

  // Check if user is already a member
  const existingMember = await getMemberByUserId(memberData.userId, memberData.associationId);
  if (existingMember) {
    throw new Error('User is already a member of this association');
  }

  const now = Date.now();
  const docRef = await db.collection(MEMBERS_COLLECTION).add({
    ...removeUndefinedValues(memberData),
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  // Update user's association IDs
  await db.collection('users').doc(memberData.userId).set({
    associationIds: firebase.firestore.FieldValue.arrayUnion(memberData.associationId),
    // Set as current if user doesn't have one
  }, { merge: true });

  console.log('[Associations] Added member:', docRef.id);
  return docRef.id;
};

/**
 * Updates a member
 */
export const updateMember = async (
  memberId: string, 
  data: Partial<Member>
): Promise<void> => {
  await db.collection(MEMBERS_COLLECTION).doc(memberId).update({
    ...removeUndefinedValues(data),
    updatedAt: Date.now(),
  });
  console.log('[Associations] Updated member:', memberId);
};

/**
 * Updates a member's role
 */
export const updateMemberRole = async (
  memberId: string,
  newRole: MemberRole
): Promise<void> => {
  // Get default permissions for the role
  const permissions = getDefaultPermissionsForRole(newRole);
  
  await db.collection(MEMBERS_COLLECTION).doc(memberId).update({
    role: newRole,
    ...permissions,
    updatedAt: Date.now(),
  });
  console.log('[Associations] Updated member role to:', newRole);
};

/**
 * Deactivates a member (soft delete)
 */
export const deactivateMember = async (
  memberId: string,
  reason?: string
): Promise<void> => {
  const member = await getMember(memberId);
  
  if (!member) {
    throw new Error('Member not found');
  }
  
  if (member.role === 'owner') {
    throw new Error('Cannot deactivate the association owner');
  }

  await db.collection(MEMBERS_COLLECTION).doc(memberId).update({
    isActive: false,
    deactivatedAt: Date.now(),
    deactivatedReason: reason || undefined,
    updatedAt: Date.now(),
  });

  // Remove association from user's list
  await db.collection('users').doc(member.userId).update({
    associationIds: firebase.firestore.FieldValue.arrayRemove(member.associationId),
  });

  console.log('[Associations] Deactivated member:', memberId);
};

/**
 * Reactivates a member
 */
export const reactivateMember = async (memberId: string): Promise<void> => {
  const member = await getMember(memberId);
  
  if (!member) {
    throw new Error('Member not found');
  }

  await db.collection(MEMBERS_COLLECTION).doc(memberId).update({
    isActive: true,
    deactivatedAt: firebase.firestore.FieldValue.delete(),
    deactivatedReason: firebase.firestore.FieldValue.delete(),
    updatedAt: Date.now(),
  });

  // Add association back to user's list
  await db.collection('users').doc(member.userId).update({
    associationIds: firebase.firestore.FieldValue.arrayUnion(member.associationId),
  });

  console.log('[Associations] Reactivated member:', memberId);
};

/**
 * Gets default permissions for a role
 */
export const getDefaultPermissionsForRole = (role: MemberRole): Partial<Member> => {
  switch (role) {
    case 'owner':
      return {
        canManagePatients: true,
        canManagePlants: true,
        canManageHarvests: true,
        canManageDistributions: true,
        canManageMembers: true,
        canViewReports: true,
        canExportData: true,
      };
    case 'admin':
      return {
        canManagePatients: true,
        canManagePlants: true,
        canManageHarvests: true,
        canManageDistributions: true,
        canManageMembers: true,
        canViewReports: true,
        canExportData: true,
      };
    case 'cultivator':
      return {
        canManagePatients: false,
        canManagePlants: true,
        canManageHarvests: true,
        canManageDistributions: false,
        canManageMembers: false,
        canViewReports: true,
        canExportData: false,
      };
    case 'patient':
      return {
        canManagePatients: false,
        canManagePlants: false,
        canManageHarvests: false,
        canManageDistributions: false,
        canManageMembers: false,
        canViewReports: false,
        canExportData: false,
      };
    case 'volunteer':
      return {
        canManagePatients: false,
        canManagePlants: true,
        canManageHarvests: false,
        canManageDistributions: false,
        canManageMembers: false,
        canViewReports: false,
        canExportData: false,
      };
    default:
      return {
        canManagePatients: false,
        canManagePlants: false,
        canManageHarvests: false,
        canManageDistributions: false,
        canManageMembers: false,
        canViewReports: false,
        canExportData: false,
      };
  }
};

// ==================== INVITATIONS ====================

/**
 * Creates an invitation to join an association
 */
export const createInvitation = async (
  invitationData: Omit<AssociationInvitation, 'id' | 'status' | 'createdAt' | 'expiresAt'>
): Promise<string> => {
  if (!invitationData.associationId) {
    throw new Error('associationId is required');
  }
  if (!invitationData.invitedEmail) {
    throw new Error('invitedEmail is required');
  }

  // Check for existing pending invitation
  const existingInvitation = await db
    .collection(INVITATIONS_COLLECTION)
    .where('associationId', '==', invitationData.associationId)
    .where('invitedEmail', '==', invitationData.invitedEmail.toLowerCase())
    .where('status', '==', 'pending')
    .limit(1)
    .get();
  
  if (!existingInvitation.empty) {
    throw new Error('An invitation is already pending for this email');
  }

  const now = Date.now();
  const expiresAt = now + (7 * 24 * 60 * 60 * 1000); // 7 days from now

  const docRef = await db.collection(INVITATIONS_COLLECTION).add({
    ...invitationData,
    invitedEmail: invitationData.invitedEmail.toLowerCase(),
    status: 'pending' as InvitationStatus,
    expiresAt,
    createdAt: now,
  });

  console.log('[Associations] Created invitation:', docRef.id);
  return docRef.id;
};

/**
 * Gets an invitation by ID
 */
export const getInvitation = async (invitationId: string): Promise<AssociationInvitation | null> => {
  const docSnap = await db.collection(INVITATIONS_COLLECTION).doc(invitationId).get();
  
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as AssociationInvitation;
  }
  return null;
};

/**
 * Gets pending invitations for a user (by email)
 */
export const getPendingInvitationsForUser = async (email: string): Promise<AssociationInvitation[]> => {
  const now = Date.now();
  
  const querySnapshot = await db
    .collection(INVITATIONS_COLLECTION)
    .where('invitedEmail', '==', email.toLowerCase())
    .where('status', '==', 'pending')
    .where('expiresAt', '>', now)
    .orderBy('expiresAt', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AssociationInvitation));
};

/**
 * Gets invitations sent by an association
 */
export const getAssociationInvitations = async (
  associationId: string,
  status?: InvitationStatus
): Promise<AssociationInvitation[]> => {
  let query = db
    .collection(INVITATIONS_COLLECTION)
    .where('associationId', '==', associationId);
  
  if (status) {
    query = query.where('status', '==', status);
  }

  const querySnapshot = await query.orderBy('createdAt', 'desc').get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as AssociationInvitation));
};

/**
 * Accepts an invitation
 */
export const acceptInvitation = async (
  invitationId: string,
  userId: string,
  userEmail: string,
  fullName: string,
  documentType: 'cpf' | 'rg' | 'passport' | 'other',
  documentNumber: string,
  displayName?: string
): Promise<string> => {
  const invitation = await getInvitation(invitationId);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }
  
  if (invitation.expiresAt < Date.now()) {
    // Update status to expired
    await db.collection(INVITATIONS_COLLECTION).doc(invitationId).update({
      status: 'expired',
    });
    throw new Error('Invitation has expired');
  }
  
  if (invitation.invitedEmail.toLowerCase() !== userEmail.toLowerCase()) {
    throw new Error('This invitation was sent to a different email address');
  }

  // Create the member
  const memberData: Omit<Member, 'id' | 'createdAt' | 'updatedAt'> = {
    associationId: invitation.associationId,
    userId,
    userEmail,
    displayName,
    role: invitation.invitedRole,
    fullName,
    documentType,
    documentNumber,
    joinDate: Date.now(),
    invitedBy: invitation.invitedBy,
    isActive: true,
    ...getDefaultPermissionsForRole(invitation.invitedRole),
  };

  const memberId = await addMember(memberData);

  // Update invitation status
  await db.collection(INVITATIONS_COLLECTION).doc(invitationId).update({
    status: 'accepted',
    acceptedAt: Date.now(),
  });

  console.log('[Associations] Invitation accepted, member created:', memberId);
  return memberId;
};

/**
 * Rejects an invitation
 */
export const rejectInvitation = async (invitationId: string): Promise<void> => {
  const invitation = await getInvitation(invitationId);
  
  if (!invitation) {
    throw new Error('Invitation not found');
  }
  
  if (invitation.status !== 'pending') {
    throw new Error('Invitation is no longer valid');
  }

  await db.collection(INVITATIONS_COLLECTION).doc(invitationId).update({
    status: 'rejected',
    rejectedAt: Date.now(),
  });

  console.log('[Associations] Invitation rejected:', invitationId);
};

/**
 * Cancels an invitation (by the sender)
 */
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  await db.collection(INVITATIONS_COLLECTION).doc(invitationId).delete();
  console.log('[Associations] Invitation cancelled:', invitationId);
};

// ==================== PERMISSION CHECKS ====================

/**
 * Checks if a user has a specific permission in an association
 */
export const hasPermission = async (
  userId: string,
  associationId: string,
  permission: keyof Pick<Member, 'canManagePatients' | 'canManagePlants' | 'canManageHarvests' | 'canManageDistributions' | 'canManageMembers' | 'canViewReports' | 'canExportData'>
): Promise<boolean> => {
  const member = await getMemberByUserId(userId, associationId);
  
  if (!member || !member.isActive) {
    return false;
  }
  
  return member[permission] === true;
};

/**
 * Checks if a user is an owner or admin of an association
 */
export const isOwnerOrAdmin = async (
  userId: string,
  associationId: string
): Promise<boolean> => {
  const member = await getMemberByUserId(userId, associationId);
  
  if (!member || !member.isActive) {
    return false;
  }
  
  return member.role === 'owner' || member.role === 'admin';
};

/**
 * Checks if a user is a member of an association
 */
export const isMember = async (
  userId: string,
  associationId: string
): Promise<boolean> => {
  const member = await getMemberByUserId(userId, associationId);
  return member !== null && member.isActive;
};

// ==================== USER'S CURRENT ASSOCIATION ====================

/**
 * Sets the user's current active association
 */
export const setCurrentAssociation = async (
  userId: string,
  associationId: string
): Promise<void> => {
  // Verify user is a member
  const member = await getMemberByUserId(userId, associationId);
  
  if (!member || !member.isActive) {
    throw new Error('User is not an active member of this association');
  }

  await db.collection('users').doc(userId).update({
    currentAssociationId: associationId,
  });

  console.log('[Associations] Set current association for user:', userId, 'to:', associationId);
};

/**
 * Gets the user's current association ID
 */
export const getCurrentAssociationId = async (userId: string): Promise<string | null> => {
  const userDoc = await db.collection('users').doc(userId).get();
  
  if (!userDoc.exists) {
    return null;
  }
  
  return userDoc.data()?.currentAssociationId || null;
};


