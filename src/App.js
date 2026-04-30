import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { initFCM, onForegroundMessage } from "./utils/fcmNotification";

import Login from "./webpage/login";
import Groups from "./webpage/group";
import Chatroom from "./webpage/room";

function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) {
        // Init FCM when user logs in
        initFCM(currentUser.uid);

        // Handle foreground notifications (when app is open)
        onForegroundMessage((payload) => {
          setNotification({
            title: payload.notification?.title || "New notification",
            body: payload.notification?.body || "",
          });
          // Auto-hide after 4 seconds
          setTimeout(() => setNotification(null), 4000);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={loadingStyle}>
        <div style={spinnerStyle} />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <>
      {/* Foreground notification toast */}
      {notification && (
        <div
          style={toastStyle}
          onClick={() => setNotification(null)} // click to dismiss
        >
          <div style={toastHeader}>
            <span>🔔 {notification.title}</span>
            <button
              onClick={() => setNotification(null)}
              style={toastCloseBtn}
            >✖</button>
          </div>
          <p style={toastBody}>{notification.body}</p>
        </div>
      )}

      {/* App screens */}
      {!room ? (
        <Groups user={user} onSelectRoom={setRoom} />
      ) : (
        <Chatroom user={user} room={room} onBack={() => setRoom(null)} />
      )}
    </>
  );
}

/* ---------------- STYLES ---------------- */

const loadingStyle = {
  display: "flex", justifyContent: "center",
  alignItems: "center", height: "100vh",
  background: "linear-gradient(135deg, #0f1017, #4e3962)",
};

const spinnerStyle = {
  width: "40px", height: "40px",
  border: "4px solid rgba(255,255,255,0.1)",
  borderTop: "4px solid #6366f1",
  borderRadius: "50%",
  animation: "spin 0.8s linear infinite",
};

const toastStyle = {
  position: "fixed", top: "20px", right: "20px",
  background: "#1e1b4b", color: "white",
  padding: "14px 18px", borderRadius: "14px",
  boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
  zIndex: 9999, minWidth: "280px", maxWidth: "340px",
  borderLeft: "4px solid #6366f1",
  cursor: "pointer",
};

const toastHeader = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", fontWeight: "bold", fontSize: "14px",
};

const toastCloseBtn = {
  background: "transparent", border: "none",
  color: "white", cursor: "pointer",
  fontSize: "12px", opacity: 0.7,
};

const toastBody = {
  margin: "6px 0 0", fontSize: "13px",
  opacity: 0.85, lineHeight: "1.4",
};

export default App;
