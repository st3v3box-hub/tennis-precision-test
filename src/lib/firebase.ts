import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
  type FirestoreSettings,
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDBFFsslNIiq1wFDOrq5eKX65fDEg_csok",
  authDomain: "tennis-precision-test.firebaseapp.com",
  projectId: "tennis-precision-test",
  storageBucket: "tennis-precision-test.firebasestorage.app",
  messagingSenderId: "458772126164",
  appId: "1:458772126164:web:e3a5a78360501c65d05e41",
};

const app = initializeApp(firebaseConfig);

// Offline support: data is cached on the device (IndexedDB) and writes are queued
// while there is no network, then synced automatically when it comes back.
// Falls back to an in-memory cache where IndexedDB is unavailable (e.g. some
// private-browsing modes) so the app still works online.
function firestoreSettings(): FirestoreSettings {
  // ignoreUndefinedProperties: SeriesResult objects may contain optional fields
  // (serveType, side, targetStrip) that are undefined for some test types.
  const base: FirestoreSettings = { ignoreUndefinedProperties: true };
  try {
    if (typeof indexedDB !== 'undefined') {
      return { ...base, localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) };
    }
  } catch { /* fall through */ }
  return { ...base, localCache: memoryLocalCache() };
}

export const db = initializeFirestore(app, firestoreSettings());
export const auth = getAuth(app);

// Sign in anonymously so Firestore security rules (request.auth != null) are satisfied.
// The session persists on the device, so this also works when reopening the app offline.
signInAnonymously(auth).catch(err => console.error('Anonymous auth failed:', err));
