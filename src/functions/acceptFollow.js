import {
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

export const acceptFollow = async (requestId, fromUserId, toUserId) => {
  // Update users
  await updateDoc(doc(db, "users", fromUserId), {
    following: arrayUnion(toUserId)
  });
  // ✅ Receiver follows sender (THIS WAS MISSING)
  await updateDoc(doc(db, "users", toUserId), {
    following: arrayUnion(fromUserId)
  });

  // ✅ Optional: keep followers list (not required for logic)
  await updateDoc(doc(db, "users", fromUserId), {
    followers: arrayUnion(toUserId)
  });

  await updateDoc(doc(db, "users", toUserId), {
    followers: arrayUnion(fromUserId)
  });

  // Remove follow request after action
  await deleteDoc(doc(db, "followRequests", requestId));
};

export const rejectFollow = async (requestId) => {
  await deleteDoc(doc(db, "followRequests", requestId));
};
