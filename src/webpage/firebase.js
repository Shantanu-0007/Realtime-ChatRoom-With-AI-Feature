// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider  } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDWLWWasT5ygEAnycDhxRSO2Omye3ZcAbs",
  authDomain: "realtime-chatroom-2005.firebaseapp.com",
  databaseURL: "https://realtime-chatroom-2005-default-rtdb.asia-south1.firebasedatabase.app",
  projectId: "realtime-chatroom-2005",
  storageBucket: "realtime-chatroom-2005.appspot.com",
  messagingSenderId: "185384671571",
  appId: "1:185384671571:web:897b10568f339c613fa9a6",
  measurementId: "G-EBR0LP9QZT"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const rtdb = getDatabase(app);

