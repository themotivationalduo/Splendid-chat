import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  getDocFromServer,
  setLogLevel,
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

// Set Firestore log level to error to suppress non-fatal connectivity warnings
setLogLevel('error');

import { getAuth } from 'firebase/auth';
import { getStorage, ref, deleteObject, getDownloadURL, uploadBytes } from 'firebase/storage';
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

// Initialize Firestore with forced HTTP long polling & adaptive local cache for instant sandbox connectivity
let firestoreInstance: Firestore;
const dbId = (firebaseConfigJson as { firestoreDatabaseId?: string }).firestoreDatabaseId;

try {
  const options = {
    experimentalForceLongPolling: true,
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  };
  firestoreInstance = dbId 
    ? initializeFirestore(app, options, dbId)
    : initializeFirestore(app, options);
} catch (e) {
  try {
    // Fallback to memory local cache if persistent IndexedDB cache is locked or unsupported
    const fallbackOptions = {
      experimentalForceLongPolling: true,
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
export const storage = getStorage(app);

// Connection test helper per Firebase Skill guidelines
async function testFirestoreConnection() {
  try {
    // Attempt a light ping after microtask queue to allow connection handshake
    setTimeout(async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        // Silently operate with local cache / retry when backend connection warms up
      }
    }, 1000);
  } catch (error) {
    // No-op
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
  serverTimestamp,
  ref,
  deleteObject,
  getDownloadURL,
  uploadBytes
};

