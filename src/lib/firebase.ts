import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
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
// ignoreUndefinedProperties: SeriesResult objects may contain optional fields
// (serveType, side, targetStrip) that are undefined for some test types.
// Without this flag Firestore throws on nested undefined values.
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
export const auth = getAuth(app);

// Sign in anonymously so Firestore security rules (request.auth != null) are satisfied
signInAnonymously(auth).catch(err => console.error('Anonymous auth failed:', err));
