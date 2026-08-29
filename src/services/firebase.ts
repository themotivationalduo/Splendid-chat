import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, arrayUnion, arrayRemove, 
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  projectId: firebaseConfigJson.projectId,
  appId: firebaseConfigJson.appId,
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
};

// Initialize Firebase App singleton
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with robust long-polling and persistence for sandbox containers
let firestoreInstance: Firestore;
try {
  const dbId = (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  firestoreInstance = dbId 
    ? initializeFirestore(app, { 
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      }, dbId)
    : initializeFirestore(app, { 
        experimentalForceLongPolling: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
      });
} catch (e) {
  // Fallback if already initialized
  const dbId = (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId;
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const db: Firestore = firestoreInstance;
export const auth = getAuth(app);

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc, arrayUnion, arrayRemove,
  serverTimestamp
};
