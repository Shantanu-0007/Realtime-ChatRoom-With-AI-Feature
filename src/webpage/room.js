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
  getDoc,
} from "firebase/firestore";
import { encryptMessage, decryptMessage, getChatKey } from "../utils/encryption";
import { isToxicMessage, maskToxicWords, loadToxicWords } from "../utils/toxicityFilter";
import { checkAIToxicity } from "../utils/aiToxicity";
import { getAIResponse } from "../utils/aiChatbot";
import { FaCog } from "react-icons/fa";
import { sendNotification, sendGroupNotification } from "../utils/fcmNotification";

function Chatroom({ user, room, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [usersMap, setUsersMap] = useState({});
  const [selectedMsg, setSelectedMsg] = useState(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [groupData, setGroupData] = useState(null); // { createdBy, members, name }
  const chatEndRef = useRef(null);

  const isPrivate = typeof room === "object" && room.type === "private";
  const isCustomGroup = typeof room === "object" && room.type === "group";
  const isCreator = isCustomGroup && groupData?.createdBy === user.uid;

  const chatKey = useMemo(() => {
    if (!isPrivate || !room?.userId) return null;
    return getChatKey(user.uid, room.userId);
  }, [isPrivate, room, user.uid]);

  const roomId = useMemo(() => {
    if (isPrivate) return [user.uid, room.userId].sort().join("_");
    if (isCustomGroup) return `group_${room.groupId}`;
    return room;
  }, [isPrivate, isCustomGroup, room, user.uid]);

  const title = isPrivate
    ? room.name
    : isCustomGroup
    ? `👥 ${room.name}`
    : `${room} Room`;

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateLabel = (timestamp) => {
    if (!timestamp) return "";
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
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
    if (status === "read") return <span style={{ color: "#53d0f9" }}>✓✓</span>;
    return null;
  };

  /* ---------------- REACTIONS ---------------- */
  const addReaction = async (emoji) => {
    if (!selectedMsg) return;
    const msgRef = doc(db, "chats", roomId, "messages", selectedMsg.id);
    const currentReactions = selectedMsg.reactions || {};
    let alreadyReactedWithSameEmoji = false;

    for (const [emo, users] of Object.entries(currentReactions)) {
      if (users.includes(user.uid)) {
        await updateDoc(msgRef, { [`reactions.${emo}`]: arrayRemove(user.uid) });
        if (emo === emoji) alreadyReactedWithSameEmoji = true;
      }
    }

    if (alreadyReactedWithSameEmoji) { setSelectedMsg(null); return; }
    await updateDoc(msgRef, { [`reactions.${emoji}`]: arrayUnion(user.uid) });
    setSelectedMsg(null);
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

  /* ---------------- LOAD GROUP DATA ---------------- */
  useEffect(() => {
    if (!isCustomGroup) return;

    const unsub = onSnapshot(doc(db, "groups", room.groupId), (snap) => {
      if (snap.exists()) setGroupData(snap.data());
    });

    return () => unsub();
  }, [isCustomGroup, room]);

  /* ---------------- LISTEN MESSAGES ---------------- */
  useEffect(() => {
    const q = query(
      collection(db, "chats", roomId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(loaded);

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.senderId !== user.uid && (!data.readBy || !data.readBy.includes(user.uid))) {
          updateDoc(docSnap.ref, { readBy: arrayUnion(user.uid) });
        }
      });
    });

    return () => unsubscribe();
  }, [roomId, user.uid]);

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = async () => {
    if (!input.trim()) return;

    try {
      const { cleanText, isToxic: datasetToxic, toxicWords } = await sanitizeMessage(input);
      const aiToxic = await checkAIToxicity(cleanText);
      const toxicDetected = datasetToxic || aiToxic;
      const safeText = toxicDetected ? maskToxicWords(cleanText, toxicWords) : cleanText;
      const finalText = isPrivate ? encryptMessage(safeText, chatKey) : safeText;

      await addDoc(collection(db, "chats", roomId, "messages"), {
        text: finalText,
        senderId: user.uid,
        timestamp: serverTimestamp(),
        isToxic: toxicDetected,
        encrypted: isPrivate,
        readBy: [user.uid],
      });

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
      // Private chat notification
      if (isPrivate) {
        await sendNotification({
          toUid: room.userId,
          title: `New message from ${user.displayName || user.email}`,
          body: safeText.slice(0, 80),
          data: { type: "private_message", fromUid: user.uid },
        });
      }

      // Group chat notification
      if (isCustomGroup && groupData?.members) {
        const otherMembers = groupData.members.filter((id) => id !== user.uid);
        await sendGroupNotification({
          toUids: otherMembers,
          title: `👥 ${room.name}`,
          body: `${user.displayName || user.email}: ${safeText.slice(0, 60)}`,
          data: { type: "group_message", groupId: room.groupId },
        });
      }
      if (cleanText.trim().toLowerCase().startsWith("@ai")) {
        const prompt = cleanText.replace(/@ai/i, "").trim();
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
    setMenuPos({ top: rect.top - 50, left: rect.left + rect.width / 2 });
    setSelectedMsg(msg);
  };

  /* ---------------- DELETE MESSAGE ---------------- */
  const deleteMessage = async () => {
    if (!selectedMsg) return;
    await deleteDoc(doc(db, "chats", roomId, "messages", selectedMsg.id));
    setSelectedMsg(null);
  };

  /* ---------------- REMOVE MEMBER (creator only) ---------------- */
  const removeMember = async (memberId) => {
    if (!isCreator) return;
    if (memberId === user.uid) return alert("You can't remove yourself.");
    const confirm = window.confirm(
      `Remove ${usersMap[memberId]?.username || "this user"} from the group?`
    );
    if (!confirm) return;

    await updateDoc(doc(db, "groups", room.groupId), {
      members: arrayRemove(memberId),
    });
  };

  /* ---------------- DELETE GROUP (creator only) ---------------- */
  const deleteGroup = async () => {
    if (!isCreator) return;
    const confirm = window.confirm(
      `Delete group "${room.name}" permanently? This cannot be undone.`
    );
    if (!confirm) return;

    // Delete all messages
    const msgsSnap = await getDocs(
      collection(db, "chats", roomId, "messages")
    );
    await Promise.all(msgsSnap.docs.map((d) => deleteDoc(d.ref)));

    // Delete chat doc
    await deleteDoc(doc(db, "chats", roomId));

    // Delete group doc
    await deleteDoc(doc(db, "groups", room.groupId));

    onBack(); // go back to groups list
  };

  /* ---------------- GROUP SETTINGS MODAL ---------------- */
  const GroupSettingsModal = () => {
    const members = groupData?.members || [];

    return (
      <div style={modalStyles.overlay} onClick={() => setShowGroupSettings(false)}>
        <div style={modalStyles.modal} onClick={(e) => e.stopPropagation()}>

          {/* Header */}
          <div style={modalStyles.header}>
            <h3 style={modalStyles.title}>⚙️ {room.name}</h3>
            <button
              style={modalStyles.closeBtn}
              onClick={() => setShowGroupSettings(false)}
            >✖</button>
          </div>

          {/* Member count */}
          <p style={modalStyles.memberCount}>
            👥 {members.length} member{members.length !== 1 ? "s" : ""}
          </p>

          {/* Members list */}
          <div style={modalStyles.memberList}>
            {members.map((memberId) => {
              const memberData = usersMap[memberId];
              const isOwner = memberId === groupData?.createdBy;
              const isSelf = memberId === user.uid;

              return (
                <div key={memberId} style={modalStyles.memberRow}>
                  {/* Avatar */}
                  <div style={modalStyles.avatar}>
                    {(memberData?.username || memberData?.email || "?")
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  {/* Name + badge */}
                  <div style={modalStyles.memberInfo}>
                    <span style={modalStyles.memberName}>
                      {isSelf
                        ? "You"
                        : memberData?.username || memberData?.email || "Unknown"}
                    </span>
                    {isOwner && (
                      <span style={modalStyles.ownerBadge}>👑 Creator</span>
                    )}
                  </div>

                  {/* Remove button — only creator sees it, not on self or other creator */}
                  {isCreator && !isSelf && !isOwner && (
                    <button
                      style={modalStyles.removeBtn}
                      onClick={() => removeMember(memberId)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Delete group — creator only */}
          {isCreator && (
            <button style={modalStyles.deleteGroupBtn} onClick={deleteGroup}>
              🗑️ Delete Group
            </button>
          )}

          {/* Leave group — non-creators */}
          {!isCreator && (
            <button
              style={modalStyles.leaveBtn}
              onClick={async () => {
                const confirm = window.confirm("Leave this group?");
                if (!confirm) return;
                await updateDoc(doc(db, "groups", room.groupId), {
                  members: arrayRemove(user.uid),
                });
                onBack();
              }}
            >
              🚪 Leave Group
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.chatCard}>

        {/* Header row */}
        <div style={styles.headerRow}>
          <button style={styles.backButton} onClick={onBack}>⬅ Back</button>
          <h2 style={styles.title}>💬 {title}</h2>
          {/* Settings icon — only in custom groups */}
          {isCustomGroup && (
            <FaCog
              style={styles.settingsIcon}
              onClick={() => setShowGroupSettings(true)}
              title="Group Settings"
            />
          )}
        </div>

        <div style={styles.chatBox}>
          {messages.map((msg, index) => {
            const currentDate = formatDateLabel(msg.timestamp);
            const prevDate = index > 0 ? formatDateLabel(messages[index - 1].timestamp) : null;
            const showDate = currentDate !== prevDate;
            const sender = msg.senderId === "AI_BOT"
              ? { username: "🤖 AI Bot" }
              : usersMap[msg.senderId];

            return (
              <React.Fragment key={msg.id}>
                {showDate && (
                  <div style={styles.dateSeparator}>{currentDate}</div>
                )}

                <div
                  onContextMenu={(e) => handleMessageHold(e, msg)}
                  onTouchStart={(e) => handleMessageHold(e, msg)}
                  style={{
                    ...styles.message,
                    alignSelf: msg.senderId === user.uid ? "flex-end" : "flex-start",
                    backgroundColor: msg.senderId === user.uid ? "#ffffff"
                      : msg.senderId === "AI_BOT" ? "#1e1b4b"
                      : "#2e2e35",
                    color: msg.senderId === user.uid ? "#111827" : "white",
                    borderLeft: msg.senderId === "AI_BOT" ? "3px solid #6366f1" : "none",
                  }}
                >
                  {!isPrivate && (
                    <b style={msg.senderId === "AI_BOT" ? { color: "#a5b4fc" } : {}}>
                      {msg.senderId === user.uid
                        ? "You"
                        : sender?.username || sender?.email || "Unknown"} :
                    </b>
                  )}

                  {msg.encrypted ? decryptMessage(msg.text, chatKey) : msg.text}

                  {msg.reactions &&
                    Object.values(msg.reactions).some((u) => u.length > 0) && (
                      <div style={styles.reactions}>
                        {Object.entries(msg.reactions).map(([emoji, users]) =>
                          users.length > 0 && (
                            <span key={emoji} style={styles.reactionItem}>
                              {emoji} {users.length}
                            </span>
                          )
                        )}
                      </div>
                    )}

                  <div style={styles.messageFooter}>
                    <span style={styles.messageTime}>{formatTime(msg.timestamp)}</span>
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
            placeholder="Type a message... (use @ai for AI)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={styles.input}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} style={styles.button}>Send</button>
        </div>

        {/* MESSAGE ACTION MENU */}
        {selectedMsg && (
          <div style={{
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
          }}>
            <span style={styles.emoji} onClick={() => addReaction("😀")}>😀</span>
            <span style={styles.emoji} onClick={() => addReaction("❤️")}>❤️</span>
            <span style={styles.emoji} onClick={() => addReaction("👍")}>👍</span>
            {selectedMsg.senderId === user.uid && (
              <button onClick={deleteMessage} style={styles.deleteBtn}>🗑️</button>
            )}
            <button onClick={() => setSelectedMsg(null)}>✖</button>
          </div>
        )}

        {/* GROUP SETTINGS MODAL */}
        {showGroupSettings && isCustomGroup && <GroupSettingsModal />}
      </div>
    </div>
  );
}

/* ---------------- MAIN STYLES ---------------- */
const styles = {
  container: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #0f1017, #4e3962)",
    fontFamily: "Segoe UI, sans-serif",
  },
  chatCard: {
    width: "400px", height: "600px",
    background: "white", borderRadius: "16px",
    padding: "20px", display: "flex",
    flexDirection: "column", position: "relative",
  },
  headerRow: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "4px",
  },
  backButton: {
    background: "black", color: "white",
    borderRadius: "8px", border: "none",
    cursor: "pointer", padding: "5px 10px",
    fontSize: "13px",
  },
  title: { textAlign: "center", fontSize: "16px", margin: 0, flex: 1 },
  settingsIcon: {
    fontSize: "18px", cursor: "pointer",
    color: "#6366f1", flexShrink: 0,
  },
  chatBox: {
    flex: 1, marginTop: "8px", padding: "10px",
    background: "#010305", borderRadius: "12px",
    overflowY: "auto", display: "flex",
    flexDirection: "column", gap: "10px",
  },
  message: {
    maxWidth: "70%", padding: "10px 15px",
    borderRadius: "20px", wordBreak: "break-word", cursor: "pointer",
  },
  inputContainer: { display: "flex", gap: "10px", marginTop: "15px" },
  input: { flex: 1, padding: "10px", borderRadius: "12px", border: "1px solid #ccc" },
  button: {
    padding: "10px 20px", background: "#6366f1",
    color: "white", border: "none", borderRadius: "12px", cursor: "pointer",
  },
  emoji: { fontSize: "20px", cursor: "pointer" },
  deleteBtn: {
    background: "red", color: "white",
    border: "none", borderRadius: "8px", cursor: "pointer",
  },
  reactions: { marginTop: "6px", display: "flex", gap: "6px", fontSize: "14px" },
  reactionItem: { background: "rgba(0,0,0,0.1)", padding: "2px 6px", borderRadius: "10px" },
  messageFooter: {
    display: "flex", justifyContent: "flex-end",
    alignItems: "center", gap: "6px", marginTop: "6px", fontSize: "11px", opacity: 0.85,
  },
  messageTime: { fontSize: "11px", whiteSpace: "nowrap" },
  tickIcon: { display: "flex", alignItems: "center" },
  dateSeparator: {
    alignSelf: "center", background: "rgba(0,0,0,0.1)",
    color: "#ffffff", padding: "4px 12px",
    borderRadius: "999px", fontSize: "12px", margin: "10px 0",
  },
};

/* ---------------- MODAL STYLES ---------------- */
const modalStyles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center",
    justifyContent: "center", zIndex: 1000,
  },
  modal: {
    background: "linear-gradient(145deg, #0d0d1a, #1a1030)",
    borderRadius: "20px", padding: "24px",
    width: "300px", color: "white",
    display: "flex", flexDirection: "column", gap: "12px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
  },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: "16px" },
  closeBtn: {
    background: "transparent", border: "none",
    color: "white", fontSize: "16px", cursor: "pointer",
  },
  memberCount: { margin: 0, fontSize: "13px", opacity: 0.6 },
  memberList: {
    maxHeight: "220px", overflowY: "auto",
    display: "flex", flexDirection: "column", gap: "8px",
    scrollbarWidth: "thin",
  },
  memberRow: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "rgba(255,255,255,0.07)",
    padding: "10px 12px", borderRadius: "12px",
  },
  avatar: {
    width: "36px", height: "36px", borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex", alignItems: "center",
    justifyContent: "center", fontWeight: "bold", flexShrink: 0,
  },
  memberInfo: { flex: 1, display: "flex", flexDirection: "column", gap: "2px" },
  memberName: { fontSize: "14px", fontWeight: "600" },
  ownerBadge: {
    fontSize: "11px", color: "#fbbf24",
    background: "rgba(251,191,36,0.15)",
    padding: "2px 8px", borderRadius: "999px",
    alignSelf: "flex-start",
  },
  removeBtn: {
    padding: "5px 10px", background: "#ef4444",
    color: "white", border: "none",
    borderRadius: "8px", cursor: "pointer",
    fontSize: "12px", flexShrink: 0,
  },
  deleteGroupBtn: {
    padding: "12px", background: "#ef4444",
    color: "white", border: "none",
    borderRadius: "12px", cursor: "pointer",
    fontWeight: "bold", fontSize: "14px",
  },
  leaveBtn: {
    padding: "12px", background: "rgba(255,255,255,0.1)",
    color: "white", border: "none",
    borderRadius: "12px", cursor: "pointer",
    fontWeight: "bold", fontSize: "14px",
  },
};

export default Chatroom;
