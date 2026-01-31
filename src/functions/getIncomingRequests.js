import { db } from "../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const getIncomingRequests = async (userId) => {
  const q = query(
    collection(db, "followRequests"),
    where("to", "==", userId),
    where("status", "==", "pending")
  );

  const snap = await getDocs(q);

  const requests = {};
  snap.forEach(doc => {
    const data = doc.data();
    requests[data.from] = doc.id; // map senderId → requestId
  });

  return requests;
};
