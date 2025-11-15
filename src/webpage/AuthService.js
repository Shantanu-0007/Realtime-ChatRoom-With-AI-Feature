// src/AuthService.js
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

// Save user profile in Firestore
const saveUserProfile = async (user) => {
  const userRef = doc(db, "users", user.uid);
  const existingDoc = await getDoc(userRef);

  // Save only if not already present
  if (!existingDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      createdAt: new Date().toISOString(),
    });
  }
};

// Signup (email/password)
export const signup = async (email, password) => {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  await saveUserProfile(res.user);
  return res;
};

// Login (email/password)
export const login = async (email, password) => {
  const res = await signInWithEmailAndPassword(auth, email, password);
  await saveUserProfile(res.user);
  return res;
};

// Google Login
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  await saveUserProfile(res.user);
  return res;
};

// Logout
export const logout = () => {
  return signOut(auth);
};
