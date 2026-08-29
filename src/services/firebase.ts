import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  getDocFromServer,
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

// Initialize Firestore with auto-detect long polling & adaptive local cache for sandbox & web environments
let firestoreInstance: Firestore;
const dbId = (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId;

try {
  const options = {
    experimentalAutoDetectLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  };
  firestoreInstance = dbId 
    ? initializeFirestore(app, options, dbId)
    : initializeFirestore(app, options);
} catch (e) {
  try {
    // Fallback to memory local cache if persistent IndexedDB cache is locked or unsupported
    const fallbackOptions = {
      experimentalAutoDetectLongPolling: true,
      localCache: memoryLocalCache()
    };
    firestoreInstance = dbId
      ? initializeFirestore(app, fallbackOptions, dbId)
      : initializeFirestore(app, fallbackOptions);
  } catch (err) {
    // Ultimate fallback if already initialized
    firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
  }
}

export const db: Firestore = firestoreInstance;
export const auth = getAuth(app);

// Connection test helper per Firebase Skill guidelines
async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.warn('Firestore client operating in offline mode.');
    }
  }
}
testFirestoreConnection();

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

