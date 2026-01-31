import { db } from "../firebase"; 
import { collection, query, where, getDocs } from "firebase/firestore";

export const searchUsers = async (username) => {
  const q = query(
    collection(db, "users"),
    where("username", ">=", username),
    where("username", "<=", username + "\uf8ff")
  );

  const results = await getDocs(q);
  const users = results.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return users;
};
