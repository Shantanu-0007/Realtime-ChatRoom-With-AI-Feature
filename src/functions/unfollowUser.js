import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { auth, db } from "../firebase";

export const unfollowUser = async (otherUserId) => {
  const currentUserId = auth.currentUser.uid;

  // Remove each other
  await updateDoc(doc(db, "users", currentUserId), {
    following: arrayRemove(otherUserId),
    followers: arrayRemove(otherUserId),
  });

  await updateDoc(doc(db, "users", otherUserId), {
    following: arrayRemove(currentUserId),
    followers: arrayRemove(currentUserId),
  });
};
