import React, { useState, useEffect, useRef, useMemo } from "react";
import { sanitizeMessage } from "../utils/sanitizeMessage";
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
  arrayRemove,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { encryptMessage, decryptMessage, getChatKey } from "../utils/encryption";
import { isToxicMessage, maskToxicWords } from "../utils/toxicityFilter";
import { checkAIToxicity } from "../utils/aiToxicity";
import { getAIResponse } from "../utils/aiChatbot";


function Chatroom({ user, room, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [usersMap, setUsersMap] = useState({});
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const chatEndRef = useRef(null);

  const isPrivate = typeof room === "object" && room.type === "private";
  const chatKey = useMemo(() => {
  if (!isPrivate || !room?.userId) return null;
  return getChatKey(user.uid, room.userId);
  }, [isPrivate, room, user.uid]);


  const roomId = useMemo(() => {
    return isPrivate
      ? [user.uid, room.userId].sort().join("_")
      : room;
  }, [isPrivate, room, user.uid]);

  const title = isPrivate ? room.name : `${room} Room`;

  const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate();
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  };

  const formatDateLabel = (timestamp) => {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  };


  /* ---------------- TICK STATUS ---------------- */
  const getTickStatus = (msg, user, isPrivate, room) => {
  if (msg.senderId !== user.uid) return null;
  if (!isPrivate) return null;
  const otherUserId = room.userId;
  if (!msg.readBy) return "sent";
  if (msg.readBy.includes(otherUserId)) return "read";
  if (msg.readBy.length > 1) return "delivered";
  return "sent";
  };
  const renderTicks = (status) => {
  if (status === "sent") return "✓";
  if (status === "delivered") return "✓✓";
  if (status === "read") return (
    <span style={{ color: "#53d0f9" }}>✓✓</span>
  );
  return null;
  };

  /* ---------------- REACTIONS ---------------- */
  const addReaction = async (emoji) => {
  if (!selectedMsg) return;
  const msgRef = doc(db, "chats", roomId, "messages", selectedMsg.id);
  const currentReactions = selectedMsg.reactions || {};
  let alreadyReactedWithSameEmoji = false;
  // Remove user from all emoji reactions
  for (const [emo, users] of Object.entries(currentReactions)) {
    if (users.includes(user.uid)) {
      await updateDoc(msgRef, {
        [`reactions.${emo}`]: arrayRemove(user.uid),
      });
      if (emo === emoji) {
        alreadyReactedWithSameEmoji = true;
      }
    }
  }
  // If same emoji clicked again → remove
  if (alreadyReactedWithSameEmoji) {
    setSelectedMsg(null);
    return;
  }
  // Add new emoji reaction
  await updateDoc(msgRef, {
    [`reactions.${emoji}`]: arrayUnion(user.uid),
  });
  setSelectedMsg(null); // auto-close menu
  };

  /* ---------------- LOAD USERS ---------------- */
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const map = {};
      snap.forEach((d) => (map[d.id] = d.data()));
      setUsersMap(map);
    };
    fetchUsers();
  }, []);

  /* ---------------- LISTEN MESSAGES ---------------- */
  useEffect(() => {
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(loaded);

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

  /* ---------------- SEND MESSAGE ---------------- */
const sendMessage = async () => {

  if (!input.trim()) return;

  try {

    // sanitize message
    const { cleanText } = sanitizeMessage(input);
    // DATASET TOXIC DETECTION
  const datasetToxic = isToxicMessage(cleanText);

  // AI TOXIC DETECTION
  const aiToxic = await checkAIToxicity(cleanText);

    // detect toxicity using your toxicityFilter.js
    const toxicDetected = datasetToxic || aiToxic;

    // mask toxic words
    const safeText = toxicDetected
      ? maskToxicWords(cleanText)
      : cleanText;

    // encrypt if private chat
    const finalText = isPrivate
      ? encryptMessage(safeText, chatKey)
      : safeText;

    // store message
    await addDoc(collection(db, "chats", roomId, "messages"), {
      text: finalText,
      senderId: user.uid,
      timestamp: serverTimestamp(),
      isToxic: toxicDetected,
      encrypted: isPrivate,
      readBy: [user.uid],
    });

    // update last message
    await setDoc(
      doc(db, "chats", roomId),
      {
        lastMessage: finalText,
        encrypted: isPrivate,
        lastTimestamp: serverTimestamp(),
        participants: isPrivate ? [user.uid, room.userId] : [],
      },
      { merge: true }
    );
    // AI BOT TRIGGER
    if (cleanText.startsWith("@ai")) {

      const prompt = cleanText.replace("@ai", "").trim();

      const aiReply = await getAIResponse(prompt);

      await addDoc(collection(db, "chats", roomId, "messages"), {
        text: aiReply,
        senderId: "AI_BOT",
        timestamp: serverTimestamp(),
        encrypted: false,
        readBy: [],
      });

    }

    setInput("");

  } catch (error) {
    console.error("Send message error:", error);
  }

  };


  /* ---------------- AUTO SCROLL ---------------- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ---------------- LONG PRESS / RIGHT CLICK ---------------- */
  const handleMessageHold = (e, msg) => {
  e.preventDefault();

  const rect = e.currentTarget.getBoundingClientRect();

  setMenuPos({
    top: rect.top - 50, // popup ABOVE message
    left: rect.left + rect.width / 2,
  });

  setSelectedMsg(msg);
  };


  /* ---------------- DELETE MESSAGE ---------------- */
  const deleteMessage = async () => {
    if (!selectedMsg) return;

    await deleteDoc(
      doc(db, "chats", roomId, "messages", selectedMsg.id)
    );
    setSelectedMsg(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatCard}>
        <button style={styles.backButton} onClick={onBack}>
          ⬅ Back
        </button>

        <h2 style={styles.title}>💬 {title}</h2>

        <div style={styles.chatBox}>
          {messages.map((msg, index) => {
            const currentDate = formatDateLabel(msg.timestamp);
            const prevDate = index > 0 ? formatDateLabel(messages[index - 1].timestamp) : null;
            const showDate = currentDate !== prevDate;
            const sender = msg.senderId === "AI_BOT" ? { username: "AI Bot" } : usersMap[msg.senderId];
            return (
              <React.Fragment key={msg.id}>
                {/*Date Separator*/}
                {showDate && (
                  <div style={styles.dateSeparator}>
                    {currentDate}
                  </div>
                )}

                {/*Message Bubble*/}
                <div
                  onContextMenu={(e) => handleMessageHold(e, msg)}
                  onTouchStart={(e) => handleMessageHold(e, msg)}
                  style={{
                    ...styles.message,
                    alignSelf:
                      msg.senderId === user.uid ? "flex-end" : "flex-start",
                    backgroundColor:
                      msg.senderId === user.uid ? "#ffffff" : "#2e2e35",
                    color:
                      msg.senderId === user.uid ? "#111827" : "white",
                  }}
                >
                    {!isPrivate && (
                    <b>
                      {msg.senderId === user.uid ? "You" : sender?.username || sender?.email || "Unknown"} :
                    </b>
                  )}
                  {msg.encrypted ? decryptMessage(msg.text, chatKey) : msg.text}
                  {/*Reactions*/}
                  {msg.reactions &&
                    Object.values(msg.reactions).some(
                      (users) => users.length > 0
                    ) && (
                      <div style={styles.reactions}>
                        {Object.entries(msg.reactions).map(
                          ([emoji, users]) =>
                            users.length > 0 && (
                              <span key={emoji} style={styles.reactionItem}>
                                {emoji} {users.length}
                              </span>
                            )
                        )}
                      </div>
                    )}

                  {/*Time*/}
                  <div style={styles.messageFooter}>
                    <span style={styles.messageTime}>
                      {formatTime(msg.timestamp)}
                    </span>
                    <span style={styles.tickIcon}>
                      {renderTicks(getTickStatus(msg, user, isPrivate, room))}
                    </span>
                  </div>
                </div>
              </React.Fragment>
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

        {/*MESSAGE ACTION MENU*/}
        {selectedMsg && (
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              transform: "translateX(-50%)",
              background: "#111",
              padding: "8px 12px",
              borderRadius: "20px",
              display: "flex",
              gap: "12px",
              zIndex: 999,
              boxShadow: "0 4px 15px rgba(0,0,0,0.4)",
            }}
          >
            <span style={styles.emoji} onClick={() => addReaction("😀")}>😀</span>
            <span style={styles.emoji} onClick={() => addReaction("❤️")}>❤️</span>
            <span style={styles.emoji} onClick={() => addReaction("👍")}>👍</span>

            {selectedMsg.senderId === user.uid && (
              <button onClick={deleteMessage} style={styles.deleteBtn}>
                🗑️
              </button>
            )}
            <button onClick={() => setSelectedMsg(null)}>✖</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #0f1017, #4e3962)",
    fontFamily: "Segoe UI, sans-serif",
  },
  chatCard: {
    width: "400px",
    height: "600px",
    background: "white",
    borderRadius: "16px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    top: "15px",
    left: "15px",
    background: "black",
    color: "white",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    padding: "5px 10px",
  },
  title: {
    textAlign: "center",
  },
  chatBox: {
    flex: 1,
    marginTop: "40px",
    padding: "10px",
    background: "#010305",
    borderRadius: "12px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  message: {
    maxWidth: "70%",
    padding: "10px 15px",
    borderRadius: "20px",
    wordBreak: "break-word",
    cursor: "pointer",
  },
  messageMeta: {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  alignSelf: "flex-end",
  fontSize: "11px",
  opacity: 0.8,
  },
//   messageTime: {
//   fontSize: "9px",
//   opacity: 0.7,
//   alignSelf: "flex-end",
//   marginTop: "2px",
// },

  inputContainer: {
    display: "flex",
    gap: "10px",
    marginTop: "15px",
  },
  input: {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "1px solid #ccc",
  },
  button: {
    padding: "10px 20px",
    background: "#6366f1",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  emoji: {
    fontSize: "20px",
    cursor: "pointer",
  },
  deleteBtn: {
    background: "red",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  reactions: {
  marginTop: "6px",
  display: "flex",
  gap: "6px",
  fontSize: "14px",
  },

  reactionItem: {
  background: "rgba(0,0,0,0.1)",
  padding: "2px 6px",
  borderRadius: "10px",
  },
  messageFooter: {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "6px",
  marginTop: "6px",
  fontSize: "11px",
  opacity: 0.85,
  },
  messageTime: {
  fontSize: "11px",
  whiteSpace: "nowrap",
  },
  tickIcon: {
  display: "flex",
  alignItems: "center",
  },
  dateSeparator: {
  alignSelf: "center",
  background: "rgba(0,0,0,0.1)",
  color: "#ffffff",
  padding: "4px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  margin: "10px 0",
  },


};

export default Chatroom;
