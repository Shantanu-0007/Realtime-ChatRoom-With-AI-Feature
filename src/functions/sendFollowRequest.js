import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { auth, db } from "../firebase";

export const sendFollowRequest = async (toUserId) => {
  const fromUserId = auth.currentUser.uid;

  if (fromUserId === toUserId) return;

  // Check if request already exists
  const q = query(
    collection(db, "followRequests"),
    where("from", "==", fromUserId),
    where("to", "==", toUserId),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);
  if (!snap.empty) return;

  await addDoc(collection(db, "followRequests"), {
    from: fromUserId,
    to: toUserId,
    status: "pending",
    timestamp: serverTimestamp()
  });
};
