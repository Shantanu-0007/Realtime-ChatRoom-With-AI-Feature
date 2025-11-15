import React, { useState } from "react";

function Groups({ onSelectRoom }) {
  const rooms = ["Notice", "Projects", "Random"];
  const privateChats = ["Leader", "Members"];

  // Track hovered button
  const [hovered, setHovered] = useState(null);

  return (
    <div style={styles.pageContainer}>
      <div style={styles.container}>
        <h2 style={styles.heading}>💬 Available Chatrooms</h2>
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

        <h3 style={styles.subHeading}>🔒 Private Chats</h3>
        <ul style={styles.list}>
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
        </ul>
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
    background: "linear-gradient(145deg, #667eea, #764ba2)",
    borderRadius: "20px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
    color: "white",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  heading: {
    marginBottom: "10px",
    textAlign: "center",
    fontSize: "22px",
    textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
  },
  subHeading: {
    marginTop: "20px",
    marginBottom: "10px",
    fontSize: "18px",
    textAlign: "center",
    textShadow: "1px 1px 2px rgba(0,0,0,0.3)",
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
    boxShadow: "0 4px 6px rgba(0,0,0,0.2)",
  },
  buttonHover: {
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    transform: "scale(1.05)",
    boxShadow: "0 6px 12px rgba(0,0,0,0.3)",
  },
};

export default Groups;
