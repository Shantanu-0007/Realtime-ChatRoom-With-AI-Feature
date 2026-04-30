import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { sendNotification } from "../utils/fcmNotification";

function CreateGroupModal({ onClose }) {
  const [groupName, setGroupName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUser = auth.currentUser;

  // Load all users except current
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const users = [];
      snap.forEach((d) => {
        if (d.id !== currentUser.uid) {
          users.push({ id: d.id, ...d.data() });
        }
      });
      setAllUsers(users);
    };
    fetchUsers();
  }, []);

  const toggleUser = (user) => {
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id)
        ? prev.filter((u) => u.id !== user.id)
        : [...prev, user]
    );
  };

  const filteredUsers = allUsers.filter((u) =>
    (u.username || u.email)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const createGroup = async () => {
    if (!groupName.trim()) return alert("Enter a group name");
    if (selectedUsers.length === 0) return alert("Select at least one user");
    setLoading(true);

    try {
      // Create group doc
      const groupRef = await addDoc(collection(db, "groups"), {
        name: groupName.trim(),
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        members: [currentUser.uid], // creator auto-joins
      });

      // Send invite to each selected user
      await Promise.all(
        selectedUsers.map((u) =>
          addDoc(collection(db, "groupInvites"), {
            groupId: groupRef.id,
            groupName: groupName.trim(),
            fromUid: currentUser.uid,
            fromName: currentUser.displayName || currentUser.email,
            toUid: u.id,
            status: "pending",
            createdAt: serverTimestamp(),
          })
        )
      );
      await Promise.all(
      selectedUsers.map((u) =>
        sendNotification({
          toUid: u.id,
          title: "👥 Group Invite",
          body: `${currentUser.displayName || currentUser.email} invited you to "${groupName}"`,
          data: { type: "group_invite" },
        })
      )
    );

      alert(`Group "${groupName}" created! Invites sent.`);
      onClose();
    } catch (err) {
      console.error("Create group error:", err);
    }

    setLoading(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>➕ Create Group</h3>

        {/* Group Name */}
        <input
          style={styles.input}
          placeholder="Group name..."
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
        />

        {/* Search Users */}
        <input
          style={styles.input}
          placeholder="Search users to invite..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* User List */}
        <div style={styles.userList}>
          {filteredUsers.map((u) => {
            const selected = selectedUsers.find((s) => s.id === u.id);
            return (
              <div
                key={u.id}
                style={{
                  ...styles.userRow,
                  background: selected
                    ? "rgba(99,102,241,0.4)"
                    : "rgba(255,255,255,0.08)",
                }}
                onClick={() => toggleUser(u)}
              >
                <div style={styles.avatar}>
                  {(u.username || u.email)?.charAt(0).toUpperCase()}
                </div>
                <span style={styles.userName}>
                  {u.username || u.email}
                </span>
                {selected && <span style={styles.check}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Selected count */}
        {selectedUsers.length > 0 && (
          <p style={styles.selectedCount}>
            {selectedUsers.length} user(s) selected
          </p>
        )}

        {/* Buttons */}
        <div style={styles.btnRow}>
          <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            style={styles.createBtn}
            onClick={createGroup}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "linear-gradient(145deg, #0d0d1a, #1a1030)",
    borderRadius: "20px",
    padding: "24px",
    width: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    color: "white",
    boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  },
  title: { textAlign: "center", margin: 0 },
  input: {
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    fontSize: "14px",
    outline: "none",
  },
  userList: {
    maxHeight: "200px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  userRow: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  avatar: {
    width: "34px", height: "34px",
    borderRadius: "50%",
    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "bold", fontSize: "14px",
  },
  userName: { flex: 1, fontSize: "14px" },
  check: { color: "#6366f1", fontWeight: "bold" },
  selectedCount: { fontSize: "12px", opacity: 0.7, margin: 0, textAlign: "center" },
  btnRow: { display: "flex", gap: "10px" },
  cancelBtn: {
    flex: 1, padding: "10px",
    borderRadius: "10px", border: "none",
    background: "rgba(255,255,255,0.1)",
    color: "white", cursor: "pointer",
  },
  createBtn: {
    flex: 1, padding: "10px",
    borderRadius: "10px", border: "none",
    background: "#6366f1", color: "white",
    cursor: "pointer", fontWeight: "bold",
  },
};

export default CreateGroupModal;