import {
  doc,
  updateDoc,
  arrayUnion,
  deleteDoc
} from "firebase/firestore";
import { db } from "../firebase";

export const acceptFollow = async (requestId, from, to) => {
  // Update follow request
  await updateDoc(doc(db, "followRequests", requestId), {
    status: "accepted"
  });

  // Update users
  await updateDoc(doc(db, "users", from), {
    following: arrayUnion(to)
  });

  await updateDoc(doc(db, "users", to), {
    followers: arrayUnion(from)
  });

  // Optional but recommended: remove request
  await deleteDoc(doc(db, "followRequests", requestId));
};
export const rejectFollow = async (requestId) => {
  await deleteDoc(doc(db, "followRequests", requestId));
};
