// Using Firebase Compat SDK for better React Native compatibility
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

// Auto-configured with Firebase CLI
// Project: grow-85028
// Last updated: 2024-11-26
const firebaseConfig = {
  apiKey: "AIzaSyBE1bBhQ4QPOXDg9NFFObJQ7Eqk70xMD-s",
  authDomain: "grow-85028.firebaseapp.com",
  projectId: "grow-85028",
  storageBucket: "grow-85028.firebasestorage.app",
  messagingSenderId: "607775361050",
  appId: "1:607775361050:web:8cd4cec8aa69d9a39929a3"
};

// Initialize Firebase app (only if not already initialized)
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Initialize Auth and Firestore using compat SDK
export const auth = app.auth();
export const db = app.firestore();

// For compatibility with code expecting getAuthInstance()
export const getAuthInstance = () => auth;

export default app;
