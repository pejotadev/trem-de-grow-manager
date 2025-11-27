// Using Firebase Compat SDK for React Native compatibility
import firebase from 'firebase/compat/app';
import { auth, db } from './firebaseConfig';
import { User } from '../types';

// Type for Firebase User from compat SDK
export type FirebaseUser = firebase.User;

export const registerUser = async (email: string, password: string): Promise<User> => {
  const userCredential = await auth.createUserWithEmailAndPassword(email, password);
  const firebaseUser = userCredential.user;

  if (!firebaseUser) {
    throw new Error('User creation failed');
  }

  const userData: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email!,
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
