import { db } from "../firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
} from "firebase/firestore";

export const chatMutualConnections = async (uid, setMutuals) => {
  const userSnap = await getDoc(doc(db, "users", uid));
  if (!userSnap.exists()) return () => {};

  const following = userSnap.data().following || [];
  const unsubscribers = [];

  for (const otherId of following) {
    const otherSnap = await getDoc(doc(db, "users", otherId));
    if (!otherSnap.exists()) continue;

    const theirFollowing = otherSnap.data().following || [];
    if (!theirFollowing.includes(uid)) continue;

    const roomId = [uid, otherId].sort().join("_");

    // Listen to chat metadata (last message)
    const unsubChat = onSnapshot(
      doc(db, "chats", roomId),
      (chatSnap) => {
        const lastMessage = chatSnap.exists()
          ? chatSnap.data().lastMessage || ""
          : "";
        const lastTimestamp = chatSnap.exists()
          ? chatSnap.data().lastTimestamp || null
          : null;

        setMutuals((prev) => {
          const others = prev.filter((u) => u.id !== otherId);

          return [
            ...others,
            {
              id: otherId,
              username: otherSnap.data().username,
              email: otherSnap.data().email,
              lastMessage,
              lastTimestamp,
              unreadCount: prev.find((u) => u.id === otherId)?.unreadCount || 0,
            },
          ].sort(
            (a, b) =>
              (b.lastTimestamp?.seconds || 0) -
              (a.lastTimestamp?.seconds || 0)
          );
        });
      }
    );

    // Listen to unread messages
    const unsubMsgs = onSnapshot(
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

        setMutuals((prev) =>
          prev.map((u) =>
            u.id === otherId ? { ...u, unreadCount: unread } : u
          )
        );
      }
    );

    unsubscribers.push(unsubChat, unsubMsgs);
  }
  return () => unsubscribers.forEach((u) => u());
};
