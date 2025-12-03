// Using Firebase Compat SDK for React Native compatibility
import { db } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { Plant, Stage, WaterRecord, EnvironmentRecord, Environment, StageName, User, FriendRequest, Friendship, FriendRequestStatus, GeneticInfo, Harvest, Patient, Distribution, Extract, Order, OrderStatus, PlantLog, BulkPlantLog, PlantLogType, SeedGenetic } from '../types';
import { 
  generateControlNumber, 
  generateCloneControlNumber, 
  generateHarvestControlNumber, 
  generateExtractControlNumber,
  generateDistributionNumber,
  generateOrderNumber 
} from '../utils/controlNumber';

// Re-export control number functions for backward compatibility
export { 
  generateControlNumber, 
  generateCloneControlNumber, 
  generateHarvestControlNumber, 
  generateExtractControlNumber,
  generateDistributionNumber,
  generateOrderNumber 
} from '../utils/controlNumber';

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

// ==================== ENVIRONMENTS ====================

export const createEnvironment = async (envData: Omit<Environment, 'id'>): Promise<string> => {
  if (!envData.userId) {
    throw new Error('userId is required to create an environment');
  }
  
  // Ensure plantCounter and harvestCounter are initialized to 0 and isPublic defaults to false
  const dataWithDefaults = {
    ...envData,
    plantCounter: 0,
    harvestCounter: 0,
    isPublic: envData.isPublic ?? false,
  };
  const docRef = await db.collection('environments').add(dataWithDefaults);
  return docRef.id;
};

export const getEnvironment = async (environmentId: string): Promise<Environment | null> => {
  console.log('[Firestore] Getting environment with ID:', environmentId);
  const docSnap = await db.collection('environments').doc(environmentId).get();
  
  if (docSnap.exists) {
    const environment = { id: docSnap.id, ...docSnap.data() } as Environment;
    console.log('[Firestore] Environment found:', environment);
    return environment;
  }
  console.log('[Firestore] Environment not found');
  return null;
};

export const getUserEnvironments = async (userId: string): Promise<Environment[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserEnvironments called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('environments')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Environment));
};

export const updateEnvironment = async (environmentId: string, data: Partial<Environment>): Promise<void> => {
  await db.collection('environments').doc(environmentId).update(removeUndefinedValues(data));
};

export const deleteEnvironment = async (environmentId: string): Promise<void> => {
  // Delete the environment
  await db.collection('environments').doc(environmentId).delete();
  
  // Delete all plants in this environment
  const plantsSnapshot = await db.collection('plants').where('environmentId', '==', environmentId).get();
  const plantDeletes = plantsSnapshot.docs.map(async (doc) => {
    // For each plant, delete its related data
    const plantId = doc.id;
    
    // Delete stages
    const stagesSnapshot = await db.collection('stages').where('plantId', '==', plantId).get();
    const stageDeletes = stagesSnapshot.docs.map(stageDoc => stageDoc.ref.delete());
    
    // Delete watering logs
    const waterSnapshot = await db.collection('wateringLogs').where('plantId', '==', plantId).get();
    const waterDeletes = waterSnapshot.docs.map(waterDoc => waterDoc.ref.delete());
    
    await Promise.all([...stageDeletes, ...waterDeletes]);
    
    // Delete the plant itself
    return doc.ref.delete();
  });
  
  // Delete all environment logs for this environment
  const envLogsSnapshot = await db.collection('environmentLogs').where('environmentId', '==', environmentId).get();
  const envLogDeletes = envLogsSnapshot.docs.map(doc => doc.ref.delete());
  
  // Execute all deletes
  await Promise.all([...plantDeletes, ...envLogDeletes]);
};

// ==================== PLANTS ====================

export const createPlant = async (plantData: Omit<Plant, 'id' | 'controlNumber' | 'name'>): Promise<string> => {
  if (!plantData.userId) {
    throw new Error('userId is required to create a plant');
  }
  
  // Get the environment to get its name and current counter
  const environment = await getEnvironment(plantData.environmentId);
  
  if (!environment) {
    throw new Error('Environment not found');
  }
  
  // Get the next sequence number (increment counter)
  const nextSequence = (environment.plantCounter || 0) + 1;
  
  // Generate control number
  const controlNumber = generateControlNumber(nextSequence);
  
  // Create the plant with generated control number
  const docRef = await db.collection('plants').add({
    ...plantData,
    controlNumber,
  });
  
  // Increment the environment's plant counter
  await db.collection('environments').doc(plantData.environmentId).update({
    plantCounter: firebase.firestore.FieldValue.increment(1),
  });
  
  console.log('[Firestore] Created plant with control number:', controlNumber);
  
  return docRef.id;
};

export const getPlant = async (plantId: string): Promise<Plant | null> => {
  console.log('[Firestore] Getting plant with ID:', plantId);
  const docSnap = await db.collection('plants').doc(plantId).get();
  
  if (docSnap.exists) {
    const plant = { id: docSnap.id, ...docSnap.data() } as Plant;
    console.log('[Firestore] Plant found:', plant);
    return plant;
  }
  console.log('[Firestore] Plant not found');
  return null;
};

export const getUserPlants = async (userId: string, includeDeleted: boolean = false): Promise<Plant[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserPlants called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('plants')
    .where('userId', '==', userId)
    .orderBy('startDate', 'desc')
    .get();
  
  const plants = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
  
  // Filter out soft-deleted plants unless includeDeleted is true
  if (includeDeleted) {
    return plants;
  }
  return plants.filter(plant => !plant.deletedAt);
};

export const getEnvironmentPlants = async (environmentId: string, userId: string, includeDeleted: boolean = false): Promise<Plant[]> => {
  if (!userId || !environmentId) {
    console.warn('[Firestore] getEnvironmentPlants called with undefined/null userId or environmentId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('plants')
    .where('userId', '==', userId)
    .where('environmentId', '==', environmentId)
    .orderBy('startDate', 'desc')
    .get();
  
  const plants = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
  
  // Filter out soft-deleted plants unless includeDeleted is true
  if (includeDeleted) {
    return plants;
  }
  return plants.filter(plant => !plant.deletedAt);
};

export const updatePlant = async (plantId: string, data: Partial<Plant>): Promise<void> => {
  await db.collection('plants').doc(plantId).update(removeUndefinedValues(data));
};

/**
 * Soft deletes a plant by setting deletedAt timestamp.
 * The plant remains in the database but is hidden from normal views.
 * Related records (harvests, distributions, extracts) can still reference the plant.
 */
export const deletePlant = async (plantId: string): Promise<void> => {
  // Soft delete - set deletedAt timestamp instead of actually deleting
  await db.collection('plants').doc(plantId).update({
    deletedAt: Date.now(),
  });
  
  console.log('[Firestore] Soft deleted plant:', plantId);
  
  // Note: We keep stages and watering logs for historical purposes
  // They won't be visible since the plant is hidden
};

// ==================== CLONE PLANTS ====================

export interface ClonePlantParams {
  sourcePlant: Plant;
  targetEnvironmentId: string;
  numberOfClones: number;
  stage: StageName;
  userId: string;
}

/**
 * Clones a plant to create multiple new plants in a target environment.
 * Clones do NOT include watering logs or stage history.
 * Control numbers start with "CL" instead of "A".
 * Automatically inherits genetic lineage from source plant.
 */
export const clonePlants = async (params: ClonePlantParams): Promise<string[]> => {
  const { sourcePlant, targetEnvironmentId, numberOfClones, stage, userId } = params;
  
  // Get target environment
  const environment = await getEnvironment(targetEnvironmentId);
  if (!environment) {
    throw new Error('Target environment not found');
  }
  
  const createdPlantIds: string[] = [];
  const now = Date.now();
  const currentCounter = environment.plantCounter || 0;
  
  console.log('[Firestore] Cloning plant:', sourcePlant.controlNumber, 'to environment:', environment.name);
  console.log('[Firestore] Creating', numberOfClones, 'clones');
  
  // Build genetic info for clones - inherit from source plant
  const cloneGeneticInfo: GeneticInfo = {
    sourceType: 'clone',
    parentPlantId: sourcePlant.id,
    parentControlNumber: sourcePlant.controlNumber,
    // Inherit genetic lineage from source (if available) or use strain
    geneticLineage: sourcePlant.genetics?.geneticLineage || sourcePlant.strain,
    // Inherit breeder info if available
    breeder: sourcePlant.genetics?.breeder,
    acquisitionDate: now,
    acquisitionSource: `Cloned from ${sourcePlant.controlNumber}`,
  };
  
  for (let i = 0; i < numberOfClones; i++) {
    // Get next sequence number
    const nextSequence = currentCounter + 1 + i;
    
    // Generate clone control number (CL prefix instead of A)
    const controlNumber = generateCloneControlNumber(nextSequence);
    
    // Create clone with genetic info
    const docRef = await db.collection('plants').add({
      userId,
      environmentId: targetEnvironmentId,
      controlNumber,
      strain: sourcePlant.strain,
      startDate: now,
      currentStage: stage,
      // Genetic tracking
      genetics: cloneGeneticInfo,
      motherPlantId: sourcePlant.id,
      // Inherit chemotype if source has it (clones should have same genetics)
      ...(sourcePlant.chemotype && { chemotype: sourcePlant.chemotype }),
    });
    
    createdPlantIds.push(docRef.id);
    
    // Create initial stage for clone
    await db.collection('stages').add({
      plantId: docRef.id,
      name: stage,
      startDate: now,
    });
    
    console.log('[Firestore] Created clone with control number:', controlNumber);
  }
  
  // Update environment plant counter
  await db.collection('environments').doc(targetEnvironmentId).update({
    plantCounter: firebase.firestore.FieldValue.increment(numberOfClones),
  });
  
  console.log('[Firestore] Successfully created', createdPlantIds.length, 'clones with genetic tracking');
  
  return createdPlantIds;
};

// ==================== STAGES ====================

export const createStage = async (stageData: Omit<Stage, 'id'>): Promise<string> => {
  const docRef = await db.collection('stages').add(stageData);
  return docRef.id;
};

export const getPlantStages = async (plantId: string): Promise<Stage[]> => {
  const querySnapshot = await db
    .collection('stages')
    .where('plantId', '==', plantId)
    .orderBy('startDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Stage));
};

export const updateStage = async (stageId: string, stageData: Partial<Omit<Stage, 'id'>>): Promise<void> => {
  await db.collection('stages').doc(stageId).update(removeUndefinedValues(stageData));
};

export const deleteStage = async (stageId: string): Promise<void> => {
  await db.collection('stages').doc(stageId).delete();
};

// ==================== WATERING LOGS ====================

export const createWaterRecord = async (waterData: Omit<WaterRecord, 'id'>): Promise<string> => {
  const docRef = await db.collection('wateringLogs').add(waterData);
  return docRef.id;
};

export const getPlantWaterRecords = async (plantId: string): Promise<WaterRecord[]> => {
  const querySnapshot = await db
    .collection('wateringLogs')
    .where('plantId', '==', plantId)
    .orderBy('date', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as WaterRecord));
};

export const deleteWaterRecord = async (recordId: string): Promise<void> => {
  await db.collection('wateringLogs').doc(recordId).delete();
};

// ==================== ENVIRONMENT LOGS ====================

export const createEnvironmentRecord = async (envData: Omit<EnvironmentRecord, 'id'>): Promise<string> => {
  const docRef = await db.collection('environmentLogs').add(envData);
  return docRef.id;
};

export const getEnvironmentRecords = async (environmentId: string): Promise<EnvironmentRecord[]> => {
  const querySnapshot = await db
    .collection('environmentLogs')
    .where('environmentId', '==', environmentId)
    .orderBy('date', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as EnvironmentRecord));
};

export const deleteEnvironmentRecord = async (recordId: string): Promise<void> => {
  await db.collection('environmentLogs').doc(recordId).delete();
};

// ==================== USER MANAGEMENT ====================

export const getUser = async (userId: string): Promise<User | null> => {
  const docSnap = await db.collection('users').doc(userId).get();
  if (docSnap.exists) {
    return docSnap.data() as User;
  }
  return null;
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  // Use set with merge to create the document if it doesn't exist
  await db.collection('users').doc(userId).set(removeUndefinedValues(data), { merge: true });
};

export const searchUsersByEmail = async (emailQuery: string, currentUserId: string): Promise<User[]> => {
  // Search for users whose email starts with the query (case-sensitive limitation of Firestore)
  const querySnapshot = await db
    .collection('users')
    .where('email', '>=', emailQuery.toLowerCase())
    .where('email', '<=', emailQuery.toLowerCase() + '\uf8ff')
    .limit(10)
    .get();
  
  return querySnapshot.docs
    .filter(doc => doc.id !== currentUserId) // Exclude current user
    .map(doc => ({
      uid: doc.id,
      ...doc.data()
    } as User));
};

// ==================== FRIEND REQUESTS ====================

export const sendFriendRequest = async (
  fromUser: User,
  toUser: User
): Promise<string> => {
  // Check if a request already exists
  const existingRequest = await db.collection('friendRequests')
    .where('fromUserId', '==', fromUser.uid)
    .where('toUserId', '==', toUser.uid)
    .where('status', '==', 'pending')
    .get();
  
  if (!existingRequest.empty) {
    throw new Error('Friend request already sent');
  }

  // Check if they are already friends
  const existingFriendship = await db.collection('friendships')
    .where('users', 'array-contains', fromUser.uid)
    .get();
  
  const alreadyFriends = existingFriendship.docs.some(doc => {
    const data = doc.data();
    return data.users.includes(toUser.uid);
  });

  if (alreadyFriends) {
    throw new Error('You are already friends');
  }

  // Check if there's a pending request from the other user
  const reverseRequest = await db.collection('friendRequests')
    .where('fromUserId', '==', toUser.uid)
    .where('toUserId', '==', fromUser.uid)
    .where('status', '==', 'pending')
    .get();

  if (!reverseRequest.empty) {
    // Auto-accept the reverse request instead
    const requestId = reverseRequest.docs[0].id;
    await acceptFriendRequest(requestId, fromUser);
    return requestId;
  }

  // Build request data, filtering out undefined values (Firestore doesn't accept them)
  const requestData: Record<string, any> = {
    fromUserId: fromUser.uid,
    fromUserEmail: fromUser.email,
    toUserId: toUser.uid,
    toUserEmail: toUser.email,
    status: 'pending',
    createdAt: Date.now(),
  };

  // Only add display names if they exist
  if (fromUser.displayName) {
    requestData.fromUserDisplayName = fromUser.displayName;
  }
  if (toUser.displayName) {
    requestData.toUserDisplayName = toUser.displayName;
  }

  const docRef = await db.collection('friendRequests').add(requestData);
  return docRef.id;
};

export const getPendingFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  if (!userId) {
    console.warn('[Firestore] getPendingFriendRequests called with undefined/null userId');
    return [];
  }
  
  // Try with orderBy first, fallback to without if index not ready
  let querySnapshot;
  try {
    querySnapshot = await db.collection('friendRequests')
      .where('toUserId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
  } catch (error: any) {
    // If index not ready, query without orderBy and sort in memory
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[Firestore] Index not ready, querying without orderBy');
      querySnapshot = await db.collection('friendRequests')
        .where('toUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();
    } else {
      throw error;
    }
  }
  
  let requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FriendRequest));
  
  // Sort in memory if we didn't use orderBy
  if (requests.length > 0 && requests[0].createdAt) {
    requests = requests.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  return requests;
};

export const getSentFriendRequests = async (userId: string): Promise<FriendRequest[]> => {
  if (!userId) {
    console.warn('[Firestore] getSentFriendRequests called with undefined/null userId');
    return [];
  }
  
  // Try with orderBy first, fallback to without if index not ready
  let querySnapshot;
  try {
    querySnapshot = await db.collection('friendRequests')
      .where('fromUserId', '==', userId)
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
  } catch (error: any) {
    // If index not ready, query without orderBy and sort in memory
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[Firestore] Index not ready, querying without orderBy');
      querySnapshot = await db.collection('friendRequests')
        .where('fromUserId', '==', userId)
        .where('status', '==', 'pending')
        .get();
    } else {
      throw error;
    }
  }
  
  let requests = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as FriendRequest));
  
  // Sort in memory if we didn't use orderBy
  if (requests.length > 0 && requests[0].createdAt) {
    requests = requests.sort((a, b) => b.createdAt - a.createdAt);
  }
  
  return requests;
};

export const acceptFriendRequest = async (requestId: string, currentUser: User): Promise<void> => {
  const requestDoc = await db.collection('friendRequests').doc(requestId).get();
  
  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const request = requestDoc.data() as FriendRequest;
  
  if (request.toUserId !== currentUser.uid && request.fromUserId !== currentUser.uid) {
    throw new Error('You cannot accept this request');
  }

  // Update request status
  await db.collection('friendRequests').doc(requestId).update({
    status: 'accepted',
  });

  // Create friendship - only include fields that have values
  const friendshipData: Record<string, any> = {
    users: [request.fromUserId, request.toUserId].sort(),
    userEmails: [request.fromUserEmail, request.toUserEmail].sort(),
    createdAt: Date.now(),
  };

  // Only add display names array if at least one exists
  if (request.fromUserDisplayName || request.toUserDisplayName) {
    friendshipData.userDisplayNames = [
      request.fromUserDisplayName || '',
      request.toUserDisplayName || ''
    ].sort();
  }

  await db.collection('friendships').add(friendshipData);
};

export const rejectFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  const requestDoc = await db.collection('friendRequests').doc(requestId).get();
  
  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const request = requestDoc.data() as FriendRequest;
  
  if (request.toUserId !== userId) {
    throw new Error('You cannot reject this request');
  }

  await db.collection('friendRequests').doc(requestId).update({
    status: 'rejected',
  });
};

export const cancelFriendRequest = async (requestId: string, userId: string): Promise<void> => {
  const requestDoc = await db.collection('friendRequests').doc(requestId).get();
  
  if (!requestDoc.exists) {
    throw new Error('Friend request not found');
  }

  const request = requestDoc.data() as FriendRequest;
  
  if (request.fromUserId !== userId) {
    throw new Error('You cannot cancel this request');
  }

  await db.collection('friendRequests').doc(requestId).delete();
};

// ==================== FRIENDSHIPS ====================

export const getFriends = async (userId: string): Promise<{ friendship: Friendship; friend: User }[]> => {
  if (!userId) {
    console.warn('[Firestore] getFriends called with undefined/null userId');
    return [];
  }
  
  // Try with orderBy first, fallback to without if index not ready
  let querySnapshot;
  try {
    querySnapshot = await db.collection('friendships')
      .where('users', 'array-contains', userId)
      .orderBy('createdAt', 'desc')
      .get();
  } catch (error: any) {
    // If index not ready, query without orderBy and sort in memory
    if (error.code === 'failed-precondition' && error.message?.includes('index')) {
      console.log('[Firestore] Index not ready, querying without orderBy');
      querySnapshot = await db.collection('friendships')
        .where('users', 'array-contains', userId)
        .get();
    } else {
      throw error;
    }
  }
  
  let friendships = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Friendship));
  
  // Sort in memory if we didn't use orderBy
  if (friendships.length > 0 && friendships[0].createdAt) {
    friendships = friendships.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get friend details for each friendship
  const friendsWithDetails = await Promise.all(
    friendships.map(async (friendship) => {
      const friendId = friendship.users.find(id => id !== userId)!;
      const friend = await getUser(friendId);
      return {
        friendship,
        friend: friend || { uid: friendId, email: 'Unknown', createdAt: 0 },
      };
    })
  );

  return friendsWithDetails;
};

export const removeFriend = async (friendshipId: string, userId: string): Promise<void> => {
  const friendshipDoc = await db.collection('friendships').doc(friendshipId).get();
  
  if (!friendshipDoc.exists) {
    throw new Error('Friendship not found');
  }

  const friendship = friendshipDoc.data() as Friendship;
  
  if (!friendship.users.includes(userId)) {
    throw new Error('You are not part of this friendship');
  }

  await db.collection('friendships').doc(friendshipId).delete();
};

export const isFriend = async (userId1: string, userId2: string): Promise<boolean> => {
  if (!userId1 || !userId2) {
    console.warn('[Firestore] isFriend called with undefined/null userId');
    return false;
  }
  
  const querySnapshot = await db.collection('friendships')
    .where('users', 'array-contains', userId1)
    .get();
  
  return querySnapshot.docs.some(doc => {
    const data = doc.data();
    return data.users.includes(userId2);
  });
};

// ==================== PUBLIC ENVIRONMENTS (Friend Access) ====================

export const getFriendPublicEnvironments = async (friendId: string, currentUserId: string): Promise<Environment[]> => {
  if (!friendId || !currentUserId) {
    console.warn('[Firestore] getFriendPublicEnvironments called with undefined/null friendId or currentUserId');
    return [];
  }
  
  // First verify they are friends
  const areFriends = await isFriend(currentUserId, friendId);
  
  if (!areFriends) {
    throw new Error('You are not friends with this user');
  }

  const querySnapshot = await db.collection('environments')
    .where('userId', '==', friendId)
    .where('isPublic', '==', true)
    .orderBy('createdAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Environment));
};

export const getFriendEnvironmentPlants = async (
  environmentId: string,
  friendId: string,
  currentUserId: string
): Promise<Plant[]> => {
  if (!environmentId || !friendId || !currentUserId) {
    console.warn('[Firestore] getFriendEnvironmentPlants called with undefined/null parameters');
    return [];
  }
  
  // First verify they are friends
  const areFriends = await isFriend(currentUserId, friendId);
  
  if (!areFriends) {
    throw new Error('You are not friends with this user');
  }

  // Verify the environment belongs to the friend and is public
  const envDoc = await db.collection('environments').doc(environmentId).get();
  
  if (!envDoc.exists) {
    throw new Error('Environment not found');
  }

  const env = envDoc.data() as Environment;
  
  if (env.userId !== friendId) {
    throw new Error('Environment does not belong to this user');
  }

  if (!env.isPublic) {
    throw new Error('This environment is not public');
  }

  const querySnapshot = await db.collection('plants')
    .where('environmentId', '==', environmentId)
    .where('userId', '==', friendId)
    .orderBy('startDate', 'desc')
    .get();
  
  const plants = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
  
  // Filter out soft-deleted plants
  return plants.filter(plant => !plant.deletedAt);
};

/**
 * Gets a friend's plant with access control verification.
 * Only allows access if:
 * 1. Users are friends
 * 2. The plant's environment is public
 */
export const getFriendPlant = async (
  plantId: string,
  friendId: string,
  currentUserId: string
): Promise<Plant | null> => {
  if (!plantId || !friendId || !currentUserId) {
    console.warn('[Firestore] getFriendPlant called with undefined/null parameters');
    return null;
  }
  
  // First verify they are friends
  const areFriends = await isFriend(currentUserId, friendId);
  
  if (!areFriends) {
    throw new Error('You are not friends with this user');
  }

  // Get the plant
  const plantDoc = await db.collection('plants').doc(plantId).get();
  
  if (!plantDoc.exists) {
    return null;
  }

  const plant = { id: plantDoc.id, ...plantDoc.data() } as Plant;
  
  // Verify the plant belongs to the friend
  if (plant.userId !== friendId) {
    throw new Error('Plant does not belong to this user');
  }

  // Verify the plant's environment is public
  const envDoc = await db.collection('environments').doc(plant.environmentId).get();
  
  if (!envDoc.exists) {
    throw new Error('Environment not found');
  }

  const env = envDoc.data() as Environment;
  
  if (!env.isPublic) {
    throw new Error('This plant is in a private environment');
  }

  return plant;
};

/**
 * Gets stage history for a friend's plant with access control verification.
 */
export const getFriendPlantStages = async (
  plantId: string,
  friendId: string,
  currentUserId: string
): Promise<Stage[]> => {
  // First verify access to the plant (this does all necessary checks)
  const plant = await getFriendPlant(plantId, friendId, currentUserId);
  
  if (!plant) {
    return [];
  }

  const querySnapshot = await db
    .collection('stages')
    .where('plantId', '==', plantId)
    .orderBy('startDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Stage));
};

/**
 * Gets watering records for a friend's plant with access control verification.
 */
export const getFriendPlantWaterRecords = async (
  plantId: string,
  friendId: string,
  currentUserId: string
): Promise<WaterRecord[]> => {
  // First verify access to the plant (this does all necessary checks)
  const plant = await getFriendPlant(plantId, friendId, currentUserId);
  
  if (!plant) {
    return [];
  }

  const querySnapshot = await db
    .collection('wateringLogs')
    .where('plantId', '==', plantId)
    .orderBy('date', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as WaterRecord));
};

// ==================== HARVESTS ====================

export const createHarvest = async (harvestData: Omit<Harvest, 'id' | 'controlNumber'>): Promise<string> => {
  if (!harvestData.userId) {
    throw new Error('userId is required to create a harvest');
  }
  
  // Get the plant to find its environment
  const plant = await getPlant(harvestData.plantId);
  
  if (!plant) {
    throw new Error('Plant not found');
  }
  
  // Get the environment to get its name and current harvest counter
  const environment = await getEnvironment(plant.environmentId);
  
  if (!environment) {
    throw new Error('Environment not found');
  }
  
  // Get the next sequence number (increment harvest counter)
  const nextSequence = (environment.harvestCounter || 0) + 1;
  
  // Generate harvest control number
  const controlNumber = generateHarvestControlNumber(nextSequence);
  
  // Create the harvest with generated control number
  const docRef = await db.collection('harvests').add({
    ...harvestData,
    controlNumber,
  });
  
  // Increment the environment's harvest counter
  await db.collection('environments').doc(plant.environmentId).update({
    harvestCounter: firebase.firestore.FieldValue.increment(1),
  });
  
  console.log('[Firestore] Created harvest with control number:', controlNumber);
  
  return docRef.id;
};

export const getHarvest = async (harvestId: string): Promise<Harvest | null> => {
  console.log('[Firestore] Getting harvest with ID:', harvestId);
  const docSnap = await db.collection('harvests').doc(harvestId).get();
  
  if (docSnap.exists) {
    const harvest = { id: docSnap.id, ...docSnap.data() } as Harvest;
    console.log('[Firestore] Harvest found:', harvest);
    return harvest;
  }
  console.log('[Firestore] Harvest not found');
  return null;
};

export const getPlantHarvests = async (plantId: string): Promise<Harvest[]> => {
  const querySnapshot = await db
    .collection('harvests')
    .where('plantId', '==', plantId)
    .orderBy('harvestDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Harvest));
};

export const getUserHarvests = async (userId: string): Promise<Harvest[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserHarvests called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('harvests')
    .where('userId', '==', userId)
    .orderBy('harvestDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Harvest));
};

export const updateHarvest = async (harvestId: string, data: Partial<Harvest>): Promise<void> => {
  await db.collection('harvests').doc(harvestId).update(removeUndefinedValues(data));
};

export const deleteHarvest = async (harvestId: string): Promise<void> => {
  await db.collection('harvests').doc(harvestId).delete();
};

// ==================== PATIENTS ====================

export const createPatient = async (patientData: Omit<Patient, 'id'>): Promise<string> => {
  if (!patientData.userId) {
    throw new Error('userId is required to create a patient');
  }
  
  const now = Date.now();
  const docRef = await db.collection('patients').add({
    ...patientData,
    createdAt: now,
    updatedAt: now,
  });
  console.log('[Firestore] Created patient with ID:', docRef.id);
  return docRef.id;
};

export const getPatient = async (patientId: string): Promise<Patient | null> => {
  console.log('[Firestore] Getting patient with ID:', patientId);
  const docSnap = await db.collection('patients').doc(patientId).get();
  
  if (docSnap.exists) {
    const patient = { id: docSnap.id, ...docSnap.data() } as Patient;
    console.log('[Firestore] Patient found:', patient.name);
    return patient;
  }
  console.log('[Firestore] Patient not found');
  return null;
};

export const getUserPatients = async (userId: string): Promise<Patient[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserPatients called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('patients')
    .where('userId', '==', userId)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Patient));
};

export const searchPatients = async (userId: string, query: string): Promise<Patient[]> => {
  // Firestore doesn't support full-text search, so we fetch all user's patients
  // and filter in memory. For production, consider Algolia or similar.
  const allPatients = await getUserPatients(userId);
  
  const lowerQuery = query.toLowerCase();
  return allPatients.filter(patient => 
    patient.name.toLowerCase().includes(lowerQuery) ||
    patient.documentNumber.toLowerCase().includes(lowerQuery) ||
    (patient.email && patient.email.toLowerCase().includes(lowerQuery)) ||
    (patient.phone && patient.phone.includes(query))
  );
};

export const updatePatient = async (patientId: string, data: Partial<Patient>): Promise<void> => {
  await db.collection('patients').doc(patientId).update({
    ...removeUndefinedValues(data),
    updatedAt: Date.now(),
  });
};

export const deactivatePatient = async (patientId: string): Promise<void> => {
  await db.collection('patients').doc(patientId).update({
    status: 'inactive',
    updatedAt: Date.now(),
  });
};

export const deletePatient = async (patientId: string): Promise<void> => {
  await db.collection('patients').doc(patientId).delete();
};

// ==================== DISTRIBUTIONS ====================

// Counter for distribution numbers (stored in a separate document)
const getNextDistributionNumber = async (userId: string): Promise<number> => {
  const counterRef = db.collection('counters').doc(`distributions_${userId}`);
  
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let nextNumber = 1;
    if (counterDoc.exists) {
      nextNumber = (counterDoc.data()?.count || 0) + 1;
    }
    
    transaction.set(counterRef, { count: nextNumber }, { merge: true });
    return nextNumber;
  });
};

export const createDistribution = async (distributionData: Omit<Distribution, 'id' | 'distributionNumber'>): Promise<string> => {
  if (!distributionData.userId) {
    throw new Error('userId is required to create a distribution');
  }
  
  // Get next distribution number
  const sequence = await getNextDistributionNumber(distributionData.userId);
  const distributionNumber = generateDistributionNumber(sequence);
  
  // Create the distribution
  const docRef = await db.collection('distributions').add({
    ...distributionData,
    distributionNumber,
    createdAt: Date.now(),
  });
  
  // If distributing from a harvest, update the harvest's distributed amount
  if (distributionData.harvestId && distributionData.quantityGrams) {
    await db.collection('harvests').doc(distributionData.harvestId).update({
      distributedGrams: firebase.firestore.FieldValue.increment(distributionData.quantityGrams),
    });
  }
  
  console.log('[Firestore] Created distribution with number:', distributionNumber);
  
  return docRef.id;
};

export const getDistribution = async (distributionId: string): Promise<Distribution | null> => {
  console.log('[Firestore] Getting distribution with ID:', distributionId);
  const docSnap = await db.collection('distributions').doc(distributionId).get();
  
  if (docSnap.exists) {
    const distribution = { id: docSnap.id, ...docSnap.data() } as Distribution;
    console.log('[Firestore] Distribution found:', distribution.distributionNumber);
    return distribution;
  }
  console.log('[Firestore] Distribution not found');
  return null;
};

export const getUserDistributions = async (userId: string): Promise<Distribution[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserDistributions called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('distributions')
    .where('userId', '==', userId)
    .orderBy('distributionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Distribution));
};

export const getPatientDistributions = async (patientId: string): Promise<Distribution[]> => {
  const querySnapshot = await db
    .collection('distributions')
    .where('patientId', '==', patientId)
    .orderBy('distributionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Distribution));
};

export const getHarvestDistributions = async (harvestId: string): Promise<Distribution[]> => {
  const querySnapshot = await db
    .collection('distributions')
    .where('harvestId', '==', harvestId)
    .orderBy('distributionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Distribution));
};

export const updateDistribution = async (distributionId: string, data: Partial<Distribution>): Promise<void> => {
  await db.collection('distributions').doc(distributionId).update(removeUndefinedValues(data));
};

export const deleteDistribution = async (distributionId: string): Promise<void> => {
  // Get the distribution first to update harvest if needed
  const distribution = await getDistribution(distributionId);
  
  if (distribution && distribution.harvestId && distribution.quantityGrams) {
    // Decrement the distributed amount from the harvest
    await db.collection('harvests').doc(distribution.harvestId).update({
      distributedGrams: firebase.firestore.FieldValue.increment(-distribution.quantityGrams),
    });
  }
  
  await db.collection('distributions').doc(distributionId).delete();
};

// ==================== EXTRACTS ====================

// Counter for extract numbers (stored in a separate document)
const getNextExtractNumber = async (userId: string): Promise<number> => {
  const counterRef = db.collection('counters').doc(`extracts_${userId}`);
  
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let nextNumber = 1;
    if (counterDoc.exists) {
      nextNumber = (counterDoc.data()?.count || 0) + 1;
    }
    
    transaction.set(counterRef, { count: nextNumber }, { merge: true });
    return nextNumber;
  });
};

export const createExtract = async (extractData: Omit<Extract, 'id' | 'controlNumber'>): Promise<string> => {
  if (!extractData.userId) {
    throw new Error('userId is required to create an extract');
  }
  
  // Get next extract number
  const sequence = await getNextExtractNumber(extractData.userId);
  const controlNumber = generateExtractControlNumber(sequence);
  
  // Create the extract
  const docRef = await db.collection('extracts').add({
    ...extractData,
    controlNumber,
    createdAt: Date.now(),
  });
  
  // Update each source harvest to track extraction
  for (const harvestId of extractData.harvestIds) {
    // Calculate how much weight was used from each harvest
    // For simplicity, we divide equally if multiple harvests
    const weightPerHarvest = extractData.inputWeightGrams / extractData.harvestIds.length;
    
    await db.collection('harvests').doc(harvestId).update({
      extractedGrams: firebase.firestore.FieldValue.increment(weightPerHarvest),
      extractedForIds: firebase.firestore.FieldValue.arrayUnion(docRef.id),
    });
  }
  
  console.log('[Firestore] Created extract with control number:', controlNumber);
  
  return docRef.id;
};

export const getExtract = async (extractId: string): Promise<Extract | null> => {
  console.log('[Firestore] Getting extract with ID:', extractId);
  const docSnap = await db.collection('extracts').doc(extractId).get();
  
  if (docSnap.exists) {
    const extract = { id: docSnap.id, ...docSnap.data() } as Extract;
    console.log('[Firestore] Extract found:', extract.controlNumber);
    return extract;
  }
  console.log('[Firestore] Extract not found');
  return null;
};

export const getUserExtracts = async (userId: string): Promise<Extract[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserExtracts called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('extracts')
    .where('userId', '==', userId)
    .orderBy('extractionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Extract));
};

export const getHarvestExtracts = async (harvestId: string): Promise<Extract[]> => {
  const querySnapshot = await db
    .collection('extracts')
    .where('harvestIds', 'array-contains', harvestId)
    .orderBy('extractionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Extract));
};

export const updateExtract = async (extractId: string, data: Partial<Extract>): Promise<void> => {
  await db.collection('extracts').doc(extractId).update(removeUndefinedValues(data));
};

export const deleteExtract = async (extractId: string): Promise<void> => {
  // Get the extract first to update harvests
  const extract = await getExtract(extractId);
  
  if (extract) {
    // Remove extraction tracking from each source harvest
    const weightPerHarvest = extract.inputWeightGrams / extract.harvestIds.length;
    
    for (const harvestId of extract.harvestIds) {
      await db.collection('harvests').doc(harvestId).update({
        extractedGrams: firebase.firestore.FieldValue.increment(-weightPerHarvest),
        extractedForIds: firebase.firestore.FieldValue.arrayRemove(extractId),
      });
    }
  }
  
  await db.collection('extracts').doc(extractId).delete();
};

// ==================== ORDERS ====================

// Counter for order numbers (stored in a separate document)
const getNextOrderNumber = async (userId: string): Promise<number> => {
  const counterRef = db.collection('counters').doc(`orders_${userId}`);
  
  return db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    let nextNumber = 1;
    if (counterDoc.exists) {
      nextNumber = (counterDoc.data()?.count || 0) + 1;
    }
    
    transaction.set(counterRef, { count: nextNumber }, { merge: true });
    return nextNumber;
  });
};

export const createOrder = async (orderData: Omit<Order, 'id' | 'orderNumber'>): Promise<string> => {
  if (!orderData.userId) {
    throw new Error('userId is required to create an order');
  }
  
  // Get next order number
  const sequence = await getNextOrderNumber(orderData.userId);
  const orderNumber = generateOrderNumber(sequence);
  
  // Create the order
  const docRef = await db.collection('orders').add({
    ...orderData,
    orderNumber,
    createdAt: Date.now(),
  });
  
  console.log('[Firestore] Created order with number:', orderNumber);
  
  return docRef.id;
};

export const getOrder = async (orderId: string): Promise<Order | null> => {
  console.log('[Firestore] Getting order with ID:', orderId);
  const docSnap = await db.collection('orders').doc(orderId).get();
  
  if (docSnap.exists) {
    const order = { id: docSnap.id, ...docSnap.data() } as Order;
    console.log('[Firestore] Order found:', order.orderNumber);
    return order;
  }
  console.log('[Firestore] Order not found');
  return null;
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserOrders called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('orders')
    .where('userId', '==', userId)
    .orderBy('requestedAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order));
};

export const getPatientOrders = async (patientId: string): Promise<Order[]> => {
  const querySnapshot = await db
    .collection('orders')
    .where('patientId', '==', patientId)
    .orderBy('requestedAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order));
};

export const getPendingOrders = async (userId: string): Promise<Order[]> => {
  if (!userId) {
    console.warn('[Firestore] getPendingOrders called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('orders')
    .where('userId', '==', userId)
    .where('status', '==', 'pending')
    .orderBy('requestedAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order));
};

export const updateOrder = async (orderId: string, data: Partial<Order>): Promise<void> => {
  await db.collection('orders').doc(orderId).update(removeUndefinedValues(data));
};

export const approveOrder = async (orderId: string): Promise<void> => {
  await db.collection('orders').doc(orderId).update({
    status: 'approved' as OrderStatus,
    processedAt: Date.now(),
  });
};

export const rejectOrder = async (orderId: string): Promise<void> => {
  await db.collection('orders').doc(orderId).update({
    status: 'rejected' as OrderStatus,
    processedAt: Date.now(),
  });
};

export const fulfillOrder = async (
  orderId: string,
  distributionData: Omit<Distribution, 'id' | 'distributionNumber'>
): Promise<string> => {
  // Create the distribution
  const distributionId = await createDistribution(distributionData);
  
  // Update the order
  await db.collection('orders').doc(orderId).update({
    status: 'fulfilled' as OrderStatus,
    processedAt: Date.now(),
    distributionId,
  });
  
  return distributionId;
};

export const cancelOrder = async (orderId: string): Promise<void> => {
  await db.collection('orders').doc(orderId).update({
    status: 'cancelled' as OrderStatus,
    processedAt: Date.now(),
  });
};

export const deleteOrder = async (orderId: string): Promise<void> => {
  await db.collection('orders').doc(orderId).delete();
};

// ==================== PLANT LOGS (Enhanced Logging System) ====================

/**
 * Helper function to remove undefined values from an object
 * Firestore doesn't accept undefined values
 */
const removeUndefinedFields = <T extends Record<string, any>>(obj: T): Partial<T> => {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      // Recursively handle nested objects (but not arrays)
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const cleaned = removeUndefinedFields(value);
        if (Object.keys(cleaned).length > 0) {
          result[key] = cleaned;
        }
      } else {
        result[key] = value;
      }
    }
  }
  return result as Partial<T>;
};

/**
 * Creates a detailed plant log entry
 */
export const createPlantLog = async (logData: Omit<PlantLog, 'id'>): Promise<string> => {
  if (!logData.userId) {
    throw new Error('userId is required to create a plant log');
  }
  if (!logData.plantId) {
    throw new Error('plantId is required to create a plant log');
  }
  
  // Remove undefined values - Firestore doesn't accept them
  const cleanedData = removeUndefinedFields({
    ...logData,
    createdAt: Date.now(),
  });
  
  const docRef = await db.collection('plantLogs').add(cleanedData);
  
  console.log('[Firestore] Created plant log with ID:', docRef.id);
  return docRef.id;
};

/**
 * Gets a specific plant log by ID
 */
export const getPlantLog = async (logId: string): Promise<PlantLog | null> => {
  const docSnap = await db.collection('plantLogs').doc(logId).get();
  
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as PlantLog;
  }
  return null;
};

/**
 * Gets all plant logs for a specific plant
 */
export const getPlantLogs = async (
  plantId: string, 
  logType?: PlantLogType,
  limit?: number
): Promise<PlantLog[]> => {
  let query = db.collection('plantLogs')
    .where('plantId', '==', plantId)
    .orderBy('date', 'desc');
  
  if (logType) {
    query = query.where('logType', '==', logType);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const querySnapshot = await query.get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PlantLog));
};

/**
 * Gets all plant logs for a user
 */
export const getUserPlantLogs = async (
  userId: string,
  logType?: PlantLogType,
  limit?: number
): Promise<PlantLog[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserPlantLogs called with undefined/null userId');
    return [];
  }
  
  let query = db.collection('plantLogs')
    .where('userId', '==', userId)
    .orderBy('date', 'desc');
  
  if (logType) {
    query = query.where('logType', '==', logType);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const querySnapshot = await query.get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as PlantLog));
};

/**
 * Updates a plant log
 */
export const updatePlantLog = async (logId: string, data: Partial<PlantLog>): Promise<void> => {
  await db.collection('plantLogs').doc(logId).update(removeUndefinedValues(data));
};

/**
 * Deletes a plant log
 */
export const deletePlantLog = async (logId: string): Promise<void> => {
  await db.collection('plantLogs').doc(logId).delete();
};

// ==================== BULK PLANT LOGS ====================

/**
 * Creates a bulk plant log that applies to multiple plants.
 * Also creates individual PlantLog entries for each plant for full traceability.
 */
export const createBulkPlantLog = async (logData: Omit<BulkPlantLog, 'id'>): Promise<string> => {
  if (!logData.userId) {
    throw new Error('userId is required to create a bulk plant log');
  }
  if (!logData.environmentId) {
    throw new Error('environmentId is required to create a bulk plant log');
  }
  if (!logData.plantIds || logData.plantIds.length === 0) {
    throw new Error('At least one plantId is required to create a bulk plant log');
  }
  
  const now = Date.now();
  
  // Remove undefined values - Firestore doesn't accept them
  const cleanedBulkData = removeUndefinedFields({
    ...logData,
    plantCount: logData.plantIds.length,
    createdAt: now,
  });
  
  // Create the bulk log entry (for environment-level tracking)
  const docRef = await db.collection('bulkPlantLogs').add(cleanedBulkData);
  const bulkLogId = docRef.id;
  
  console.log('[Firestore] Created bulk plant log with ID:', bulkLogId, 'for', logData.plantIds.length, 'plants');
  
  // Create individual PlantLog entries for each plant
  // This ensures each plant's history shows all activities applied to it
  const { plantIds, environmentId, plantCount, ...logDataWithoutBulkFields } = logData;
  
  const individualLogPromises = plantIds.map(async (plantId) => {
    const individualLogData = removeUndefinedFields({
      ...logDataWithoutBulkFields,
      plantId,
      userId: logData.userId,
      date: logData.date,
      createdAt: now,
      bulkLogId, // Reference to the parent bulk log
      fromBulkUpdate: true, // Flag to indicate this came from a bulk update
    });
    
    return db.collection('plantLogs').add(individualLogData);
  });
  
  try {
    await Promise.all(individualLogPromises);
    console.log('[Firestore] Created', plantIds.length, 'individual plant logs from bulk update');
  } catch (error) {
    console.error('[Firestore] Error creating individual plant logs:', error);
    // Don't throw - the bulk log was created successfully
  }
  
  return bulkLogId;
};

/**
 * Gets a specific bulk plant log by ID
 */
export const getBulkPlantLog = async (logId: string): Promise<BulkPlantLog | null> => {
  const docSnap = await db.collection('bulkPlantLogs').doc(logId).get();
  
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() } as BulkPlantLog;
  }
  return null;
};

/**
 * Gets all bulk plant logs for an environment
 */
export const getEnvironmentBulkLogs = async (
  environmentId: string,
  logType?: PlantLogType,
  limit?: number
): Promise<BulkPlantLog[]> => {
  let query = db.collection('bulkPlantLogs')
    .where('environmentId', '==', environmentId)
    .orderBy('date', 'desc');
  
  if (logType) {
    query = query.where('logType', '==', logType);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const querySnapshot = await query.get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as BulkPlantLog));
};

/**
 * Gets all bulk plant logs that include a specific plant
 */
export const getPlantBulkLogs = async (
  plantId: string,
  limit?: number
): Promise<BulkPlantLog[]> => {
  let query = db.collection('bulkPlantLogs')
    .where('plantIds', 'array-contains', plantId)
    .orderBy('date', 'desc');
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const querySnapshot = await query.get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as BulkPlantLog));
};

/**
 * Gets all bulk plant logs for a user
 */
export const getUserBulkPlantLogs = async (
  userId: string,
  logType?: PlantLogType,
  limit?: number
): Promise<BulkPlantLog[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserBulkPlantLogs called with undefined/null userId');
    return [];
  }
  
  let query = db.collection('bulkPlantLogs')
    .where('userId', '==', userId)
    .orderBy('date', 'desc');
  
  if (logType) {
    query = query.where('logType', '==', logType);
  }
  
  if (limit) {
    query = query.limit(limit);
  }
  
  const querySnapshot = await query.get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as BulkPlantLog));
};

/**
 * Updates a bulk plant log
 */
export const updateBulkPlantLog = async (logId: string, data: Partial<BulkPlantLog>): Promise<void> => {
  await db.collection('bulkPlantLogs').doc(logId).update(removeUndefinedValues(data));
};

/**
 * Deletes a bulk plant log
 */
export const deleteBulkPlantLog = async (logId: string): Promise<void> => {
  await db.collection('bulkPlantLogs').doc(logId).delete();
};

/**
 * Gets combined logs for a plant (both individual and bulk logs that include this plant)
 * Returns them sorted by date, newest first
 */
export const getAllLogsForPlant = async (
  plantId: string,
  limit?: number
): Promise<{ type: 'individual' | 'bulk'; log: PlantLog | BulkPlantLog }[]> => {
  const [individualLogs, bulkLogs] = await Promise.all([
    getPlantLogs(plantId, undefined, limit),
    getPlantBulkLogs(plantId, limit),
  ]);
  
  // Combine and sort by date
  const combined: { type: 'individual' | 'bulk'; log: PlantLog | BulkPlantLog }[] = [
    ...individualLogs.map(log => ({ type: 'individual' as const, log })),
    ...bulkLogs.map(log => ({ type: 'bulk' as const, log })),
  ];
  
  combined.sort((a, b) => b.log.date - a.log.date);
  
  if (limit) {
    return combined.slice(0, limit);
  }
  
  return combined;
};

// ==================== SEED GENETICS LIBRARY ====================

/**
 * Creates a new seed genetic entry in the user's genetics library
 */
export const createSeedGenetic = async (geneticData: Omit<SeedGenetic, 'id'>): Promise<string> => {
  if (!geneticData.userId) {
    throw new Error('userId is required to create a seed genetic');
  }
  
  if (!geneticData.name) {
    throw new Error('name is required to create a seed genetic');
  }
  
  const now = Date.now();
  const dataWithTimestamps = {
    ...geneticData,
    createdAt: now,
    updatedAt: now,
  };
  
  const docRef = await db.collection('seedGenetics').add(dataWithTimestamps);
  
  console.log('[Firestore] Created seed genetic with ID:', docRef.id);
  return docRef.id;
};

/**
 * Gets a specific seed genetic by ID
 */
export const getSeedGenetic = async (geneticId: string): Promise<SeedGenetic | null> => {
  console.log('[Firestore] Getting seed genetic with ID:', geneticId);
  const docSnap = await db.collection('seedGenetics').doc(geneticId).get();
  
  if (docSnap.exists) {
    const genetic = { id: docSnap.id, ...docSnap.data() } as SeedGenetic;
    console.log('[Firestore] Seed genetic found:', genetic.name);
    return genetic;
  }
  console.log('[Firestore] Seed genetic not found');
  return null;
};

/**
 * Gets all seed genetics for a user, sorted by name
 */
export const getUserSeedGenetics = async (userId: string): Promise<SeedGenetic[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserSeedGenetics called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('seedGenetics')
    .where('userId', '==', userId)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SeedGenetic));
};

/**
 * Searches seed genetics by name or breeder
 */
export const searchSeedGenetics = async (userId: string, query: string): Promise<SeedGenetic[]> => {
  // Firestore doesn't support full-text search, so we fetch all user's genetics
  // and filter in memory
  const allGenetics = await getUserSeedGenetics(userId);
  
  const lowerQuery = query.toLowerCase();
  return allGenetics.filter(genetic => 
    genetic.name.toLowerCase().includes(lowerQuery) ||
    (genetic.breeder && genetic.breeder.toLowerCase().includes(lowerQuery)) ||
    (genetic.seedBank && genetic.seedBank.toLowerCase().includes(lowerQuery)) ||
    (genetic.lineage && genetic.lineage.toLowerCase().includes(lowerQuery))
  );
};

/**
 * Updates a seed genetic entry
 */
export const updateSeedGenetic = async (geneticId: string, data: Partial<SeedGenetic>): Promise<void> => {
  await db.collection('seedGenetics').doc(geneticId).update({
    ...removeUndefinedValues(data),
    updatedAt: Date.now(),
  });
  console.log('[Firestore] Updated seed genetic:', geneticId);
};

/**
 * Deletes a seed genetic entry
 * Note: This does not affect plants that were created using this genetic
 */
export const deleteSeedGenetic = async (geneticId: string): Promise<void> => {
  await db.collection('seedGenetics').doc(geneticId).delete();
  console.log('[Firestore] Deleted seed genetic:', geneticId);
};

/**
 * Gets seed genetics filtered by type (e.g., feminized, autoflower)
 */
export const getSeedGeneticsByType = async (
  userId: string,
  seedType: SeedGenetic['seedType']
): Promise<SeedGenetic[]> => {
  if (!userId) {
    console.warn('[Firestore] getSeedGeneticsByType called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('seedGenetics')
    .where('userId', '==', userId)
    .where('seedType', '==', seedType)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SeedGenetic));
};

/**
 * Gets seed genetics filtered by breeder
 */
export const getSeedGeneticsByBreeder = async (
  userId: string,
  breeder: string
): Promise<SeedGenetic[]> => {
  if (!userId) {
    console.warn('[Firestore] getSeedGeneticsByBreeder called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('seedGenetics')
    .where('userId', '==', userId)
    .where('breeder', '==', breeder)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SeedGenetic));
};

// ==================== ASSOCIATION-BASED QUERIES ====================
// These functions query data by associationId instead of userId
// Use these when working within an association context

/**
 * Gets all environments for an association
 */
export const getAssociationEnvironments = async (associationId: string): Promise<Environment[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationEnvironments called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('environments')
    .where('associationId', '==', associationId)
    .orderBy('createdAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Environment));
};

/**
 * Gets all plants for an association
 */
export const getAssociationPlants = async (associationId: string, includeDeleted: boolean = false): Promise<Plant[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationPlants called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('plants')
    .where('associationId', '==', associationId)
    .orderBy('startDate', 'desc')
    .get();
  
  const plants = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
  
  if (includeDeleted) {
    return plants;
  }
  return plants.filter(plant => !plant.deletedAt);
};

/**
 * Gets all harvests for an association
 */
export const getAssociationHarvests = async (associationId: string): Promise<Harvest[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationHarvests called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('harvests')
    .where('associationId', '==', associationId)
    .orderBy('harvestDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Harvest));
};

/**
 * Gets all patients for an association
 */
export const getAssociationPatients = async (associationId: string): Promise<Patient[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationPatients called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('patients')
    .where('associationId', '==', associationId)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Patient));
};

/**
 * Gets all distributions for an association
 */
export const getAssociationDistributions = async (associationId: string): Promise<Distribution[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationDistributions called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('distributions')
    .where('associationId', '==', associationId)
    .orderBy('distributionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Distribution));
};

/**
 * Gets all extracts for an association
 */
export const getAssociationExtracts = async (associationId: string): Promise<Extract[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationExtracts called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('extracts')
    .where('associationId', '==', associationId)
    .orderBy('extractionDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Extract));
};

/**
 * Gets all orders for an association
 */
export const getAssociationOrders = async (associationId: string): Promise<Order[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationOrders called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('orders')
    .where('associationId', '==', associationId)
    .orderBy('requestedAt', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Order));
};

/**
 * Gets all seed genetics for an association
 */
export const getAssociationSeedGenetics = async (associationId: string): Promise<SeedGenetic[]> => {
  if (!associationId) {
    console.warn('[Firestore] getAssociationSeedGenetics called with undefined/null associationId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('seedGenetics')
    .where('associationId', '==', associationId)
    .orderBy('name', 'asc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as SeedGenetic));
};

/**
 * Helper function to get data by userId OR associationId
 * Useful for backwards compatibility - tries association first, falls back to user
 */
export const getEnvironmentsForContext = async (
  userId: string,
  associationId?: string
): Promise<Environment[]> => {
  if (associationId) {
    return getAssociationEnvironments(associationId);
  }
  return getUserEnvironments(userId);
};

export const getPlantsForContext = async (
  userId: string,
  associationId?: string,
  includeDeleted: boolean = false
): Promise<Plant[]> => {
  if (associationId) {
    return getAssociationPlants(associationId, includeDeleted);
  }
  return getUserPlants(userId, includeDeleted);
};

export const getHarvestsForContext = async (
  userId: string,
  associationId?: string
): Promise<Harvest[]> => {
  if (associationId) {
    return getAssociationHarvests(associationId);
  }
  return getUserHarvests(userId);
};

export const getPatientsForContext = async (
  userId: string,
  associationId?: string
): Promise<Patient[]> => {
  if (associationId) {
    return getAssociationPatients(associationId);
  }
  return getUserPatients(userId);
};

export const getDistributionsForContext = async (
  userId: string,
  associationId?: string
): Promise<Distribution[]> => {
  if (associationId) {
    return getAssociationDistributions(associationId);
  }
  return getUserDistributions(userId);
};

export const getExtractsForContext = async (
  userId: string,
  associationId?: string
): Promise<Extract[]> => {
  if (associationId) {
    return getAssociationExtracts(associationId);
  }
  return getUserExtracts(userId);
};

export const getOrdersForContext = async (
  userId: string,
  associationId?: string
): Promise<Order[]> => {
  if (associationId) {
    return getAssociationOrders(associationId);
  }
  return getUserOrders(userId);
};

export const getSeedGeneticsForContext = async (
  userId: string,
  associationId?: string
): Promise<SeedGenetic[]> => {
  if (associationId) {
    return getAssociationSeedGenetics(associationId);
  }
  return getUserSeedGenetics(userId);
};
