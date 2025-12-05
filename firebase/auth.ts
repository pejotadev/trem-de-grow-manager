// Using Firebase Compat SDK for React Native compatibility
import firebase from 'firebase/compat/app';
import { auth, db } from './firebaseConfig';
import { User, AccountType } from '../types';

// Type for Firebase User from compat SDK
export type FirebaseUser = firebase.User;

/**
 * Checks if a user exists by email address
 * Queries the Firestore users collection
 */
export const checkUserExistsByEmail = async (email: string): Promise<{ exists: boolean; userId?: string }> => {
  const normalizedEmail = email.toLowerCase().trim();
  
  const querySnapshot = await db
    .collection('users')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();
  
  if (querySnapshot.empty) {
    return { exists: false };
  }
  
  return { exists: true, userId: querySnapshot.docs[0].id };
};

/**
 * Extracts the username from an email address (part before @)
 */
export const getPasswordFromEmail = (email: string): string => {
  const username = email.split('@')[0];
  return username || 'temppass123';
};

/**
 * Creates a new user account for an invited member
 * WARNING: This will sign out the current user! The inviter needs to re-login.
 * Returns the created user's data
 */
export const createInvitedUser = async (
  email: string,
  inviterEmail: string,
  inviterPassword: string
): Promise<{ user: User; tempPassword: string }> => {
  const normalizedEmail = email.toLowerCase().trim();
  const tempPassword = getPasswordFromEmail(email);
  
  // Create the new user (this signs us in as the new user)
  const userCredential = await auth.createUserWithEmailAndPassword(normalizedEmail, tempPassword);
  const newFirebaseUser = userCredential.user;

  if (!newFirebaseUser) {
    throw new Error('User creation failed');
  }

  const newUserData: User = {
    uid: newFirebaseUser.uid,
    email: newFirebaseUser.email!,
    accountType: 'personal', // Invited users are personal accounts
    createdAt: Date.now(),
  };

  // Save user data to Firestore
  await db.collection('users').doc(newFirebaseUser.uid).set(newUserData);

  // Sign out the new user
  await auth.signOut();

  // Re-authenticate as the inviter
  await auth.signInWithEmailAndPassword(inviterEmail, inviterPassword);

  return { user: newUserData, tempPassword };
};

/**
 * Creates a new user account for an invited member (simple version)
 * This version doesn't require re-authentication - the inviter stays logged out
 * Use when you want to handle re-login separately
 */
export const createInvitedUserSimple = async (email: string): Promise<{ userId: string; tempPassword: string }> => {
  const normalizedEmail = email.toLowerCase().trim();
  const tempPassword = getPasswordFromEmail(email);
  
  // Create the new user (this signs us in as the new user)
  const userCredential = await auth.createUserWithEmailAndPassword(normalizedEmail, tempPassword);
  const newFirebaseUser = userCredential.user;

  if (!newFirebaseUser) {
    throw new Error('User creation failed');
  }

  const newUserData: User = {
    uid: newFirebaseUser.uid,
    email: newFirebaseUser.email!,
    accountType: 'personal', // Invited users are personal accounts
    createdAt: Date.now(),
  };

  // Save user data to Firestore
  await db.collection('users').doc(newFirebaseUser.uid).set(newUserData);

  // Sign out the new user so the inviter can log back in
  await auth.signOut();

  return { userId: newFirebaseUser.uid, tempPassword };
};

export const registerUser = async (email: string, password: string, accountType: AccountType): Promise<User> => {
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const firebaseUser = userCredential.user;

  if (!firebaseUser) {
    throw new Error('User creation failed');
  }

  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
    accountType,
    createdAt: Date.now(),
  };

  // Save user data to Firestore
  await db.collection('users').doc(firebaseUser.uid).set(userData);

  return userData;
};

export const loginUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  const firebaseUser = userCredential.user;

  if (!firebaseUser) {
    throw new Error('Login failed');
  }

  // Fetch user data from Firestore
  const userDoc = await db.collection('users').doc(firebaseUser.uid).get();
  
  if (!userDoc.exists) {
    throw new Error('User data not found');
  }

  return userDoc.data() as User;
};

export const logoutUser = async (): Promise<void> => {
  await auth.signOut();
};

export const observeAuthState = (callback: (user: firebase.User | null) => void): (() => void) => {
  return auth.onAuthStateChanged(callback);
};
