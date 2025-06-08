// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Paste your config here (from Firebase console)
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBXRir1j_jwpTNhfpkYSjW9u4t5FOQTj9U",
    authDomain: "socialapp-e5e1b.firebaseapp.com",
    projectId: "socialapp-e5e1b",
    storageBucket: "socialapp-e5e1b.firebasestorage.app",
    messagingSenderId: "253599172276",
    appId: "1:253599172276:web:9d0a70414d26bdf48a39e1",
    measurementId: "G-3PQ4XTD4JD"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
