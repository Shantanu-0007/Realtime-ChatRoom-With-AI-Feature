import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from "firebase/firestore";

function PrivateChat({ otherUser }) {
  const current = auth.currentUser.uid;
  const chatId = current < otherUser ? `${current}_${otherUser}` : `${otherUser}_${current}`;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const msgsRef = collection(db, "privateChats", chatId, "messages");
    const q = query(msgsRef, orderBy("timestamp"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;

    await addDoc(collection(db, "privateChats", chatId, "messages"), {
      sender: current,
      text,
      timestamp: serverTimestamp(),
    });

    setText("");
  };

  return (
    <div style={styles.container}>
      <h3>Chat with {otherUser}</h3>

      <div style={styles.chatBox}>
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              ...styles.msg,
              alignSelf: m.sender === current ? "flex-end" : "flex-start",
              background: m.sender === current ? "#4f46e5" : "#ddd",
              color: m.sender === current ? "white" : "black",
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
        />
        <button style={styles.send} onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: "500px",
    margin: "20px auto",
    background: "white",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },
  chatBox: {
    height: "350px",
    overflowY: "auto",
    background: "#f5f5f5",
    padding: "10px",
    borderRadius: "10px",
    display: "flex",
    flexDirection: "column",
  },
  msg: {
    padding: "10px 15px",
    borderRadius: "12px",
    marginBottom: "10px",
    maxWidth: "60%",
  },
  inputRow: {
    display: "flex",
    marginTop: "15px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  send: {
    padding: "10px 15px",
    marginLeft: "10px",
    background: "#111",
    color: "white",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default PrivateChat;
