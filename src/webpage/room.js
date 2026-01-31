import React, { useState, useEffect, useRef, useMemo} from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  getDocs,
  setDoc,
  updateDoc,
  arrayUnion,
  doc,
} from "firebase/firestore";

function Chatroom({ user, room, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [usersMap, setUsersMap] = useState({});
  const chatEndRef = useRef(null);

  const isPrivate = typeof room === "object" && room.type === "private";

  const roomId = useMemo(() => {
  return isPrivate
    ? [user.uid, room.userId].sort().join("_")
    : room;
  }, [isPrivate, room, user.uid]);


  const title = isPrivate
    ? `${room.name}`
    : `${room} Room`;

  

  // Load users
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      setUsersMap(map);
    };
    fetchUsers();
  }, []);

  // Listen for messages
  useEffect(() => {
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }))
      );
      snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (
        data.senderId !== user.uid &&
        (!data.readBy || !data.readBy.includes(user.uid))
      ) {
        updateDoc(docSnap.ref, {
          readBy: arrayUnion(user.uid),
        });
      }
    });
    });

    return () => unsubscribe();
  }, [roomId, user.uid]);

  // MARK MESSAGES AS READ
  useEffect(() => {
    messages.forEach(async (msg) => {
      if (!msg.readBy || !msg.readBy.includes(user.uid)) {
        await updateDoc(
          doc(db, "chats", roomId, "messages", msg.id),
          {
            readBy: arrayUnion(user.uid),
          }
        );
      }
    });
  }, [messages, roomId, user.uid]);

  //last read timestamp
  useEffect(() => {
  if (!user || !roomId || !isPrivate) return;

  updateDoc(doc(db, "users", user.uid), {
    [`lastRead.${roomId}`]: serverTimestamp(),
  });
  }, [roomId, user, isPrivate]);


  // Send message
  const sendMessage = async () => {
    if (!input.trim()) return;

    await addDoc(collection(db, "chats", roomId, "messages"), {
      text: input,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      readBy: [user.uid],
    });
    await setDoc(
  doc(db, "chats", roomId),
  {
    lastMessage: input,
    lastTimestamp: serverTimestamp(),
    participants: [user.uid, room.userId],
  },
  { merge: true }
);

    setInput("");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.container}>
      <div style={styles.chatCard}>
        <button style={styles.backButton} onClick={onBack}>
          ⬅ Back
        </button>

        <h2 style={styles.title}>💬 {title}</h2>

        <div style={styles.chatBox}>
          {messages.map((msg) => {
            const sender = usersMap[msg.senderId];

            return (
              <div
                key={msg.id}
                style={{
                  ...styles.message,
                  alignSelf:
                    msg.senderId === user.uid ? "flex-end" : "flex-start",
                  backgroundColor:
                    msg.senderId === user.uid ? "#6366f1" : "#e5e7eb",
                  color:
                    msg.senderId === user.uid ? "white" : "#111827",
                }}
              >
                <b>
                  {msg.senderId === user.uid
                    ? "You"
                    : sender?.username || sender?.email || "Unknown"}
                  :
                </b>{" "}
                {msg.text}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        <div style={styles.inputContainer}>
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={styles.button}>
            Send
          </button>
        </div>
      </div>
    </div>
  );
}


const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "Segoe UI, sans-serif",
  },
  chatCard: {
    width: "400px",
    height: "600px",
    background: "white",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    padding: "20px",
    position: "relative"
  },
  backButton: {
    position: "absolute",
    top: "15px",
    left: "15px",
    padding: "5px 10px",
    border: "none",
    background: "black",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer"
  },
  title: {
    textAlign: "center",
    marginBottom: "10px",
    color: "#111827",
  },
  chatBox: {
    flex: 1,
    overflowY: "auto",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    backgroundColor: "#f9fafb",
    borderRadius: "12px",
    marginTop: "40px",
  },
  message: {
    maxWidth: "70%",
    padding: "10px 15px",
    borderRadius: "20px",
    wordBreak: "break-word",
  },
  inputContainer: {
    display: "flex",
    marginTop: "15px",
    gap: "10px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #d1d5db",
    outline: "none",
  },
  button: {
    padding: "10px 20px",
    backgroundColor: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Chatroom;
