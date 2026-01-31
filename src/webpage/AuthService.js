import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

// ---------- Username check ----------
const isUsernameTaken = async (username) => {
  const q = query(
    collection(db, "users"),
    where("username", "==", username.toLowerCase())
  );
  const snap = await getDocs(q);
  return !snap.empty;
};

// ---------- Signup ----------
export const signup = async (email, password, username) => {
  if (!username.trim()) throw new Error("Username is required");

  if (await isUsernameTaken(username)) {
    throw new Error("Username already taken");
  }

  const res = await createUserWithEmailAndPassword(auth, email, password);

  await setDoc(doc(db, "users", res.user.uid), {
    uid: res.user.uid,
    email,
    username: username.toLowerCase(),
    followers: [],
    following: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return res;
};

// ---------- Login ----------
export const login = async (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

// ---------- Google Login ----------
export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);

  const userRef = doc(db, "users", res.user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    let base = res.user.displayName
      ?.replace(/\s+/g, "")
      .toLowerCase() || "user";

    let username = base;
    let i = 1;

    while (await isUsernameTaken(username)) {
      username = `${base}${i++}`;
    }

    await setDoc(userRef, {
      uid: res.user.uid,
      email: res.user.email,
      username,
      followers: [],
      following: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  return res;
};

// ---------- Logout ----------
export const logout = () => signOut(auth);
