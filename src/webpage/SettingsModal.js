// src/webpage/SettingsModal.js
import React, { useState, useEffect } from "react";
import { auth } from "../firebase";
import { db } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { FaCog } from "react-icons/fa";
import { signOut } from "firebase/auth";


function SettingsModal({ onClose }) {
  const user = auth.currentUser;
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const handleLogout = async () => {
  await signOut(auth);
  onClose();
  };


  useEffect(() => {
    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUsername(snap.data().username || "");
        }
      } catch (err) {
        alert(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user.uid]);

  const handleSave = async () => {
    if (!username.trim()) {
      alert("Username cannot be empty");
      return;
    }

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          username: username.toLowerCase(),
          email: user.email,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      onClose();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>Loading…</div>
      </div>
    );
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* ⚙️ icon only */}
        <div style={styles.iconWrap}>
          <FaCog />
        </div>

        {/* Label ABOVE input */}
        <label style={styles.label}>Your username</label>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={styles.input}
        />

        <div style={styles.actions}>
          <button style={styles.saveBtn} onClick={handleSave}>
            Save
          </button>
          <button style={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <div style={styles.logoutWrap}>
          <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    width: "280px",
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch", // 🔑 fixes alignment
  },
  iconWrap: {
    fontSize: "20px",
    textAlign: "center",
    marginBottom: "12px",
  },
  logoutWrap: {
  marginTop: "14px",
  textAlign: "center",
},

logoutBtn: {
  background: "transparent",
  color: "#ef4444",
  border: "none",
  fontWeight: "600",
  cursor: "pointer",
  fontSize: "13px",
},

  label: {
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "6px",
    color: "#374151",
    textAlign: "left",
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    boxSizing: "border-box",
    border: "1px solid #ccc",
    outline: "none",
    marginBottom: "16px",
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
  },
  saveBtn: {
    background: "#6366f1",
    color: "white",
    border: "none",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  cancelBtn: {
    background: "#e5e7eb",
    border: "none",
    padding: "8px 18px",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

export default SettingsModal;
