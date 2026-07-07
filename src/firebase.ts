import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Allowed configuration structure
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

// Check localStorage first, so the user can easily paste their config in the admin UI
const getSavedConfig = (): FirebaseConfig | null => {
  try {
    const saved = localStorage.getItem('LG_MULTIMARCAS_FIREBASE_CONFIG');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed as FirebaseConfig;
      }
    }
  } catch (e) {
    console.error('Error reading Firebase config from localStorage:', e);
  }
  return null;
};

const DEFAULT_CONFIG: FirebaseConfig & { firestoreDatabaseId?: string } = {
  projectId: "voltaic-compiler-08gvj",
  appId: "1:555127034321:web:0e087ce9da7d7dcf2950f0",
  apiKey: "AIzaSyBp_uhkYO2YvN-Mr0kv8wUvC-Pohd23lKg",
  authDomain: "voltaic-compiler-08gvj.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-lgmultimarcas-f6bcf759-1a42-4b58-8d7a-d2263e5af987",
  storageBucket: "voltaic-compiler-08gvj.firebasestorage.app",
  messagingSenderId: "555127034321"
};

// Initial setup with potential default config or null
let firebaseApp: any = null;
let dbInstance: any = null;
let authInstance: any = null;
let isEnabled = false;

const config = getSavedConfig() || DEFAULT_CONFIG;

if (config) {
  try {
    if (getApps().length === 0) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }
    if (config.firestoreDatabaseId) {
      dbInstance = getFirestore(firebaseApp, config.firestoreDatabaseId);
    } else {
      dbInstance = getFirestore(firebaseApp);
    }
    authInstance = getAuth(firebaseApp);
    isEnabled = true;
    console.log('🔥 Firebase successfully initialized with config!');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase with config:', error);
  }
} else {
  console.log('ℹ️ Firebase not configured yet. Using high-fidelity local state fallback.');
}

export { firebaseApp };
export const db = dbInstance;
export const auth = authInstance;

export function isFirebaseEnabled(): boolean {
  return isEnabled;
}

// Function to save config and restart/reload
export function saveFirebaseConfig(newConfig: FirebaseConfig | null): void {
  if (newConfig) {
    localStorage.setItem('LG_MULTIMARCAS_FIREBASE_CONFIG', JSON.stringify(newConfig));
  } else {
    localStorage.removeItem('LG_MULTIMARCAS_FIREBASE_CONFIG');
  }
  window.location.reload();
}
