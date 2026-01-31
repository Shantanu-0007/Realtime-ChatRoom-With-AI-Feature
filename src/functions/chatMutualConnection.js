import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";

export const chatMutualConnections = async (uid, setMutuals) => {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return () => {};

  const following = userSnap.data().following || [];
  const unsubscribers = [];

  following.forEach(async (otherId) => {
    const otherSnap = await getDoc(doc(db, "users", otherId));
    if (!otherSnap.exists()) return;

    const theirFollowing = otherSnap.data().following || [];
    if (!theirFollowing.includes(uid)) return;

    const roomId = [uid, otherId].sort().join("_");

    const unsub = onSnapshot(
      collection(db, "chats", roomId, "messages"),
      (snap) => {
        let unread = 0;

        snap.forEach((m) => {
          const d = m.data();
          if (
            d.senderId === otherId &&
            (!d.readBy || !d.readBy.includes(uid))
          ) {
            unread++;
          }
        });

        setMutuals((prev) => {
          const filtered = prev.filter((u) => u.id !== otherId);
          return [
            ...filtered,
            {
              id: otherId,
              username: otherSnap.data().username,
              email: otherSnap.data().email,
              unreadCount: unread,
            },
          ];
        });
      }
    );

    unsubscribers.push(unsub);
  });

  return () => unsubscribers.forEach((u) => u());
};
