import React, { useState, useEffect, useRef } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp
} from "firebase/firestore";

function Chatroom({ user, room, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const chatEndRef = useRef(null);

  // Load messages realtime from Firestore
  useEffect(() => {
    const q = query(
      collection(db, "rooms", room, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(loaded);
    });

    return () => unsubscribe();
  }, [room]);

  // Send message to Firestore
  const sendMessage = async () => {
    if (input.trim() === "") return;

    await addDoc(collection(db, "rooms", room, "messages"), {
      sender: user,
      text: input,
      timestamp: serverTimestamp(),
    });

    setInput("");
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div style={styles.container}>
      <div style={styles.chatCard}>
        
        {/* Back Button */}
        <button style={styles.backButton} onClick={onBack}>⬅ Back</button>
        
        <h2 style={styles.title}>💬 {room} Room</h2>

        <div style={styles.chatBox}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.message,
                alignSelf: msg.sender === user ? "flex-end" : "flex-start",
                backgroundColor: msg.sender === user ? "#6366f1" : "#e5e7eb",
                color: msg.sender === user ? "white" : "#111827",
              }}
            >
              <b>{msg.sender}:</b> {msg.text}
            </div>
          ))}
          <div ref={chatEndRef}></div>
        </div>

        <div style={styles.inputContainer}>
          <input
            type="text"
            placeholder="Type a message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={styles.button}>Send</button>
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
