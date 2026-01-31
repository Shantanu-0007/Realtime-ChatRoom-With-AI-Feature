import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export const listenFollowRequests = (userId, callback) => {
  const q = query(
    collection(db, "followRequests"),
    where("to", "==", userId),
    where("status", "==", "pending")
  );

  return onSnapshot(q, (snap) => {
    const data = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(data);
  });
};
