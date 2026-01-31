import { db } from "../firebase";
import { collection, getDocs } from "firebase/firestore";

export const searchUsers = async (searchText = "") => {
  const snap = await getDocs(collection(db, "users"));

  const text = searchText.toLowerCase().trim();
  const results = [];

  snap.forEach((doc) => {
    const data = doc.data();

    const username = data.username?.toLowerCase() || "";
    const email = data.email?.toLowerCase() || "";

    // 🔍 If no search text → show all users
    if (!text) {
      results.push({
        id: doc.id,
        username: data.username || null,
        email: data.email,
      });
      return;
    }

    // 🔍 Filter only when searching
    if (username.includes(text) || email.includes(text)) {
      results.push({
        id: doc.id,
        username: data.username || null,
        email: data.email,
      });
    }
  });

  return results;
};
