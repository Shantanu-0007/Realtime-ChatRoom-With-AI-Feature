import React, { useEffect, useState } from "react";
import { FaSearch, FaCog } from "react-icons/fa";
import SettingsModal from "./SettingsModal";
import SearchUsers from "../components/SearchUsers";
// import FollowRequests from "../components/FollowRequests";
import { chatMutualConnections } from "../functions/chatMutualConnection";
import { auth } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

function Groups({ onSelectRoom }) {
  const rooms = ["Notice", "Projects", "Random"];
  //const privateChats = ["Leader", "Members"];
  const [mutuals, setMutuals] = useState([]);
  const [hovered, setHovered] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
  const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (!user) return;

    chatMutualConnections(user.uid, setMutuals);
  });

  return () => unsubscribeAuth();
  }, []);


  return (
    <div style={styles.pageContainer}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          {/* LEFT: Settings */}
          <FaCog
            style={styles.settingsIcon}
            title="Settings"
            onClick={() => setShowSettings(true)}
          />
          {/* <FollowRequests /> */}

          {/* CENTER: Title */}
          <h2 style={styles.heading}>💬 Chatrooms</h2>

          {/* RIGHT: Search */}
          <FaSearch
            style={styles.searchIcon}
            title="Search users"
            onClick={() => setShowSearch(true)}
          />
        </div>

        {/* Public Rooms */}
        <ul style={styles.list}>
          {rooms.map((room, index) => (
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

        {/* Private Chats */}
        <h3 style={styles.subHeading}>🔒 Private Chats</h3>

<div className="private-chat-scroll">
  {mutuals.length === 0 && (
    <p style={{ opacity: 0.6, textAlign: "center" }}>
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
      {/* LEFT */}
      <div style={styles.privateLeft}>
        <div style={styles.privateAvatar}>
          {(u.username || u.email)?.charAt(0).toUpperCase()}
        </div>

        <div>
          <div style={styles.privateName}>
            {u.username || u.email}
          </div>
          <div style={styles.privateSub}>{u.lastMessage || "Tap to chat"}</div>
        </div>
      </div>

      {/* RIGHT */}
      {u.unreadCount > 0 && (
        <div style={styles.unreadBadge}>{u.unreadCount}</div>
      )}
    </div>
  ))}
</div>

        {/* <ul style={styles.list}>
          {privateChats.map((chat, index) => (
            <li key={index} style={styles.listItem}>
              <button
                style={{
                  ...styles.button,
                  ...(hovered === `chat-${index}` ? styles.buttonHover : {}),
                }}
                onMouseEnter={() => setHovered(`chat-${index}`)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelectRoom(chat)}
              >
                Chat with {chat}
              </button>
            </li>
          ))}
        </ul> */}

        {/* 🔍 Search Modal */}
        {showSearch && (
          <SearchUsers onClose={() => setShowSearch(false)} />
        )}

        {/* ⚙️ Settings Modal */}
        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}

      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  container: {
    padding: "30px",
    width: "300px",
    height: "500px",
    background: "linear-gradient(145deg, #667eea, #764ba2)",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    position: "relative",
  },

  /* Header */
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heading: {
    fontSize: "20px",
    textAlign: "center",
    flex: 1,
  },
  settingsIcon: {
    cursor: "pointer",
    fontSize: "18px",
  },
  searchIcon: {
    cursor: "pointer",
    fontSize: "18px",
  },

  /* Lists */
  subHeading: {
    marginTop: "20px",
    marginBottom: "10px",
    fontSize: "18px",
    textAlign: "center",
  },
  list: {
    listStyle: "none",
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  listItem: {
    display: "flex",
    justifyContent: "center",
  },
  privateChatList: {
  maxHeight: "150px",
  overflowY: "auto",
  scrollbarWidth: "thin",
  position: "sticky",
  backdropFilter: "blur(6px)",
  transition: "background 0.2s ease, transform 0.2s ease",
  top: 0,
  },
  button: {
    width: "100%",
    padding: "12px 15px",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "all 0.3s ease",
  },
  buttonHover: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: "scale(1.05)",
  },
  privateChatRow: {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px",
  borderRadius: "14px",
  background: "rgba(255,255,255,0.18)",
  marginBottom: "10px",
  cursor: "pointer",
  transition: "transform 0.2s ease, background 0.2s ease",
},

  privateLeft: {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  },

  privateAvatar: {
  width: "40px",
  height: "40px",
  borderRadius: "50%",
  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  color: "white",
  },

  privateName: {
  fontWeight: "600",
  color: "white",
  fontSize: "14px",
  },

  privateSub: {
  fontSize: "12px",
  opacity: 0.7,
  color: "white",
  },

  unreadBadge: {
  minWidth: "22px",
  height: "22px",
  borderRadius: "50%",
  background: "#ef4444",
  color: "white",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "12px",
  fontWeight: "bold",
  },

};

export default Groups;
