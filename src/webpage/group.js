import React, { useEffect, useState } from "react";
import { FaSearch, FaCog, FaUsers } from "react-icons/fa";
import SettingsModal from "./SettingsModal";
import SearchUsers from "../components/SearchUsers";
import CreateGroupModal from "../components/CreateGroupModal";
import GroupInvites from "../components/GroupInvites";
import { chatMutualConnections } from "../functions/chatMutualConnection";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { decryptMessage, getChatKey } from "../utils/encryption";
import {
  collection, onSnapshot, query, where,
} from "firebase/firestore";

const scrollbarStyle = `
  .custom-scroll::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scroll::-webkit-scrollbar-thumb {
    background: rgba(99, 102, 241, 0.5);
    border-radius: 999px;
  }
  .custom-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(99, 102, 241, 0.9);
  }
`;
function Groups({ onSelectRoom }) {
  const defaultRooms = ["Notice", "Projects", "Random"];
  const [mutuals, setMutuals] = useState([]);
  const [customGroups, setCustomGroups] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const currentUser = auth.currentUser;

  // Load mutual chats
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      chatMutualConnections(user.uid, setMutuals);
    });
    return () => unsubscribeAuth();
  }, []);

  // Load custom groups where current user is a member
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", currentUser.uid)
    );

    const unsub = onSnapshot(q, (snap) => {
      const groups = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCustomGroups(groups);
    });

    return () => unsub();
  }, [currentUser]);

  return (
    <div style={styles.pageContainer}>
      <style>{scrollbarStyle}</style>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          {/* LEFT: Settings + Create Group */}
          <div style={styles.leftIcons}>
            <FaCog
              style={styles.icon}
              title="Settings"
              onClick={() => setShowSettings(true)}
            />
            <FaUsers
              style={{ ...styles.icon, color: "#a5b4fc" }}
              title="Create Group"
              onClick={() => setShowCreateGroup(true)}
            />
          </div>

          {/* CENTER: Title */}
          <h2 style={styles.heading}>💬 Chatrooms</h2>

          {/* RIGHT: Invites bell + Search */}
          <div style={styles.rightIcons}>
            <GroupInvites />
            <FaSearch
              style={styles.icon}
              title="Search users"
              onClick={() => setShowSearch(true)}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={styles.scrollArea}>

          {/* Default Public Rooms */}
          <ul style={styles.list}>
            {defaultRooms.map((room, index) => (
              <li key={index} style={styles.listItem}>
                <button
                  style={{
                    ...styles.button,
                    ...(hovered === `room-${index}` ? styles.buttonHover : {}),
                  }}
                  onMouseEnter={() => setHovered(`room-${index}`)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelectRoom(room)}
                >
                  {room}
                </button>
              </li>
            ))}
          </ul>

          {/* Custom Groups */}
          {customGroups.length > 0 && (
            <>
              <h3 style={styles.subHeading}>My Groups</h3>
              <ul className="custom-scroll" style={styles.groupList}>
                {customGroups.map((group) => (
                  <li key={group.id} style={styles.listItem}>
                    <button
                      style={{
                        ...styles.button,
                        ...(hovered === `group-${group.id}` ? styles.buttonHover : {}),
                        borderLeft: "3px solid #6366f1",
                      }}
                      onMouseEnter={() => setHovered(`group-${group.id}`)}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() =>
                        onSelectRoom({
                          type: "group",
                          groupId: group.id,
                          name: group.name,
                        })
                      }
                    >
                      👥 {group.name}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Mutual / Private Chats */}
          <h3 style={styles.subHeading}>Mutual Chats</h3>
          <div className="custom-scroll" style={styles.mutualList}>
            {mutuals.length === 0 && (
              <p style={{ opacity: 0.6, textAlign: "center", fontSize: "13px" }}>
                No private chats yet
              </p>
            )}
            {mutuals.map((u) => (
              <div
                key={u.id}
                style={styles.privateChatRow}
                onClick={() =>
                  onSelectRoom({
                    type: "private",
                    userId: u.id,
                    name: u.username || u.email,
                  })
                }
              >
                <div style={styles.privateLeft}>
                  <div style={styles.privateAvatar}>
                    {(u.username || u.email)?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={styles.privateName}>{u.username || u.email}</div>
                    <div style={styles.privateSub}>
                      {u.lastMessage
                        ? decryptMessage(u.lastMessage, getChatKey(currentUser.uid, u.id)) || "🔒 Encrypted"
                        : "Tap to chat"}
                    </div>
                  </div>
                </div>
                {u.unreadCount > 0 && (
                  <div style={styles.unreadBadge}>{u.unreadCount}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modals */}
        {showSearch && <SearchUsers onClose={() => setShowSearch(false)} />}
        {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex", justifyContent: "center", alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #c6cde9, #d9cfe4)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    padding: "20px",
    width: "300px", height: "560px",
    background: "linear-gradient(145deg, #000104, #12091b)",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    color: "white",
    display: "flex", flexDirection: "column", gap: "12px",
    position: "relative",
  },
  header: {
    display: "flex", alignItems: "center",
    justifyContent: "space-between",
  },
  leftIcons: { display: "flex", alignItems: "center", gap: "10px" },
  rightIcons: { display: "flex", alignItems: "center", gap: "10px" },
  icon: { cursor: "pointer", fontSize: "18px" },
  heading: { fontSize: "18px", textAlign: "center", flex: 1, margin: 0 },
  scrollArea: {
  overflowY: "auto",
  flex: 1,
  scrollbarWidth: "none", // hide Firefox scrollbar on outer
  display: "flex",
  flexDirection: "column",
  gap: "8px",
},
groupList: {
  listStyle: "none",
  padding: 0,
  margin: 0,
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  maxHeight: "112px",  // exactly 2 items (each ~48px + 8px gap)
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(99,102,241,0.5) transparent",
},
mutualList: {
  maxHeight: "200px",
  overflowY: "auto",
  scrollbarWidth: "thin",
  scrollbarColor: "rgba(99,102,241,0.5) transparent",
  display: "flex",
  flexDirection: "column",
  gap: "0px",
},
  subHeading: {
    fontSize: "14px", textAlign: "center",
    opacity: 0.7, margin: "8px 0 4px",
  },
  list: { listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "8px" },
  listItem: { display: "flex", justifyContent: "center" },
  button: {
    width: "100%", padding: "12px 15px",
    backgroundColor: "rgba(255,255,255,0.15)",
    border: "none", borderRadius: "12px",
    color: "white", fontWeight: "bold",
    cursor: "pointer", transition: "all 0.3s ease",
    textAlign: "left",
  },
  buttonHover: { backgroundColor: "rgba(255,255,255,0.3)", transform: "scale(1.02)" },
  privateChatRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px", borderRadius: "14px",
    background: "rgba(255,255,255,0.08)",
    marginBottom: "8px", cursor: "pointer",
    transition: "transform 0.2s ease, background 0.2s ease",
  },
  privateLeft: { display: "flex", alignItems: "center", gap: "10px" },
  privateAvatar: {
    width: "38px", height: "38px", borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "bold", color: "white",
  },
  privateName: { fontWeight: "600", color: "white", fontSize: "14px" },
  privateSub: { fontSize: "12px", opacity: 0.7, color: "white" },
  unreadBadge: {
    minWidth: "22px", height: "22px", borderRadius: "50%",
    background: "#ef4444", color: "white",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "12px", fontWeight: "bold",
  },
};

export default Groups;
