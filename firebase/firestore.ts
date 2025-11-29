// Using Firebase Compat SDK for React Native compatibility
import { db } from './firebaseConfig';
import firebase from 'firebase/compat/app';
import { Plant, Stage, WaterRecord, EnvironmentRecord, Environment, StageName, User, FriendRequest, Friendship, FriendRequestStatus, GeneticInfo, Harvest, Patient, Distribution, Extract } from '../types';

// ==================== UTILITIES ====================

/**
 * Generates a control number in format: A-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: A-MT-2025-00001 for "Main Tent" environment
 */
export const generateControlNumber = (environmentName: string, sequence: number): string => {
  // Get initials from environment name (first letter of each word)
  const initials = environmentName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  // Get current year
  const year = new Date().getFullYear();
  
  // Format sequence with leading zeros (5 digits)
  const sequenceStr = String(sequence).padStart(5, '0');
  
  return `A-${initials}-${year}-${sequenceStr}`;
};

/**
 * Generates a control number for clones in format: CL-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: CL-MT-2025-00001 for a clone in "Main Tent" environment
 */
export const generateCloneControlNumber = (environmentName: string, sequence: number): string => {
  // Get initials from environment name (first letter of each word)
  const initials = environmentName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  // Get current year
  const year = new Date().getFullYear();
  
  // Format sequence with leading zeros (5 digits)
  const sequenceStr = String(sequence).padStart(5, '0');
  
  return `CL-${initials}-${year}-${sequenceStr}`;
};

/**
 * Generates a control number for harvests in format: H-{ENV_INITIALS}-{YEAR}-{SEQUENCE}
 * Example: H-MT-2025-00001 for a harvest in "Main Tent" environment
 */
export const generateHarvestControlNumber = (environmentName: string, sequence: number): string => {
  // Get initials from environment name (first letter of each word)
  const initials = environmentName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
  
  // Get current year
  const year = new Date().getFullYear();
  
  // Format sequence with leading zeros (5 digits)
  const sequenceStr = String(sequence).padStart(5, '0');
  
  return `H-${initials}-${year}-${sequenceStr}`;
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
  await db.collection('environments').doc(environmentId).update(data);
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

export const createPlant = async (plantData: Omit<Plant, 'id' | 'controlNumber'>): Promise<string> => {
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
  const controlNumber = generateControlNumber(environment.name, nextSequence);
  
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

export const getUserPlants = async (userId: string): Promise<Plant[]> => {
  if (!userId) {
    console.warn('[Firestore] getUserPlants called with undefined/null userId');
    return [];
  }
  
  const querySnapshot = await db
    .collection('plants')
    .where('userId', '==', userId)
    .orderBy('startDate', 'desc')
    .get();
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
};

export const getEnvironmentPlants = async (environmentId: string, userId: string): Promise<Plant[]> => {
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
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
};

export const updatePlant = async (plantId: string, data: Partial<Plant>): Promise<void> => {
  await db.collection('plants').doc(plantId).update(data);
};

export const deletePlant = async (plantId: string): Promise<void> => {
  // Delete the plant
  await db.collection('plants').doc(plantId).delete();
  
  // Delete all related stages
  const stagesSnapshot = await db.collection('stages').where('plantId', '==', plantId).get();
  const stageDeletes = stagesSnapshot.docs.map(doc => doc.ref.delete());
  
  // Delete all related watering logs
  const waterSnapshot = await db.collection('wateringLogs').where('plantId', '==', plantId).get();
  const waterDeletes = waterSnapshot.docs.map(doc => doc.ref.delete());
  
  // Execute all deletes in parallel (environment logs are no longer tied to plants)
  await Promise.all([...stageDeletes, ...waterDeletes]);
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
  
  console.log('[Firestore] Cloning plant:', sourcePlant.name, 'to environment:', environment.name);
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
    acquisitionSource: `Cloned from ${sourcePlant.name}`,
  };
  
  for (let i = 0; i < numberOfClones; i++) {
    // Get next sequence number
    const nextSequence = currentCounter + 1 + i;
    
    // Generate clone control number (CL prefix instead of A)
    const controlNumber = generateCloneControlNumber(environment.name, nextSequence);
    
    // Create clone with genetic info
    const docRef = await db.collection('plants').add({
      userId,
      environmentId: targetEnvironmentId,
      controlNumber,
      name: `${sourcePlant.name} Clone ${i + 1}`,
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
  await db.collection('users').doc(userId).set(data, { merge: true });
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
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Plant));
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
  const controlNumber = generateHarvestControlNumber(environment.name, nextSequence);
  
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
  await db.collection('harvests').doc(harvestId).update(data);
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
    ...data,
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

/**
 * Generates a distribution number in format: D-YYYY-#####
 * Example: D-2025-00001
 */
export const generateDistributionNumber = (sequence: number): string => {
  const year = new Date().getFullYear();
  const sequenceStr = String(sequence).padStart(5, '0');
  return `D-${year}-${sequenceStr}`;
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
  await db.collection('distributions').doc(distributionId).update(data);
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

/**
 * Generates an extract control number in format: EX-YYYY-#####
 * Example: EX-2025-00001
 */
export const generateExtractControlNumber = (sequence: number): string => {
  const year = new Date().getFullYear();
  const sequenceStr = String(sequence).padStart(5, '0');
  return `EX-${year}-${sequenceStr}`;
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
  await db.collection('extracts').doc(extractId).update(data);
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
