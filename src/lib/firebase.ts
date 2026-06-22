// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCxcm0khoXhPxCTJs9rNKhUIIsTy2rFmYs",
  authDomain: "meiyu-a00e3.firebaseapp.com",
  projectId: "meiyu-a00e3",
  storageBucket: "meiyu-a00e3.firebasestorage.app",
  messagingSenderId: "687997790583",
  appId: "1:687997790583:web:ac89bcee0faf880f475972",
  measurementId: "G-NMW1F42XWX"
};

const app = initializeApp(firebaseConfig);
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connectivity check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.code === 'unavailable') {
      console.warn("Failed to connect to Firestore. If you just created this Firebase project, please ensure you have clicked 'Create Database' in the Firestore section of the Firebase Console.", error);
    } else if (error?.code === 'permission-denied') {
      // This is expected if rules are locked down, it means we connected successfully.
      console.log('Firebase connection successful (permission denied is expected without rules)');
    } else {
      console.warn("Firebase connection error:", error);
    }
  }
}
testConnection();
