// lib/firebase.ts
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
const firebaseConfig = {
  apiKey: "AIzaSyAFEQr6oAFlZhwFIVbQxn6uwAurvwrvlz8",
  authDomain: "study-go-37c39.firebaseapp.com",
  projectId: "study-go-37c39",
  storageBucket: "study-go-37c39.firebasestorage.app",
  messagingSenderId: "124573683721",
  appId: "1:124573683721:web:8cc72488e0fafd446d68d8",
  measurementId: "G-HQZ5CJZC9Q"
};


const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
