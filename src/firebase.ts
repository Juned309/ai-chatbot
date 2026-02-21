import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";   // 👈 ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyBwk8hNbGQIKU-1__kQDJTdIsHTQt5mtMk",
  authDomain: "ai-chatbot-92e9a.firebaseapp.com",
  projectId: "ai-chatbot-92e9a",
  storageBucket: "ai-chatbot-92e9a.firebasestorage.app",
  messagingSenderId: "980868441134",
  appId: "1:980868441134:web:21ede54614234c36c6abbf",
  measurementId: "G-X0WKQWBJ4G"
};

const app = initializeApp(firebaseConfig);

let analytics;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}

const auth = getAuth(app);   // 👈 ADD THIS
const db = getFirestore(app);

export { app, db, auth };   // 👈 EXPORT auth