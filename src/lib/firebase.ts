import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAJ5fWlU_qTGH6B71TdsSNxlTqRclWQkWk",
  authDomain: "musa-4930c.firebaseapp.com",
  projectId: "musa-4930c",
  storageBucket: "musa-4930c.firebasestorage.app",
  messagingSenderId: "404237008264",
  appId: "1:404237008264:web:6828d471b2189e238a8e3d",
  measurementId: "G-8KTGJ0RPLE"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);