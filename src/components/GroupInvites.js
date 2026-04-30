import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import {
  collection, query, where, onSnapshot,
  updateDoc, doc, arrayUnion,
} from "firebase/firestore";

function GroupInvites() {
  const [invites, setInvites] = useState([]);
  const [show, setShow] = useState(false);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(
      collection(db, "groupInvites"),
      where("toUid", "==", currentUser.uid),
      where("status", "==", "pending")
    );
    const unsub = onSnapshot(q, (snap) => {
      setInvites(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const acceptInvite = async (invite) => {
    // Add user to group members
    await updateDoc(doc(db, "groups", invite.groupId), {
      members: arrayUnion(currentUser.uid),
    });
    // Mark invite as accepted
    await updateDoc(doc(db, "groupInvites", invite.id), {
      status: "accepted",
    });
  };

  const declineInvite = async (invite) => {
    await updateDoc(doc(db, "groupInvites", invite.id), {
      status: "declined",
    });
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Bell icon with badge */}
      <div style={styles.bell} onClick={() => setShow(!show)}>
        🔔
        {invites.length > 0 && (
          <span style={styles.badge}>{invites.length}</span>
        )}
      </div>

      {/* Dropdown */}
      {show && (
        <div style={styles.dropdown}>
          <p style={styles.dropTitle}>Group Invites</p>
          {invites.length === 0 && (
            <p style={styles.empty}>No pending invites</p>
          )}
          {invites.map((inv) => (
            <div key={inv.id} style={styles.inviteCard}>
              <p style={styles.inviteName}>📢 {inv.groupName}</p>
              <p style={styles.inviteFrom}>from {inv.fromName}</p>
              <div style={styles.inviteBtns}>
                <button
                  style={styles.acceptBtn}
                  onClick={() => acceptInvite(inv)}
                >
                  ✓ Accept
                </button>
                <button
                  style={styles.declineBtn}
                  onClick={() => declineInvite(inv)}
                >
                  ✕ Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles = {
  bell: {
    fontSize: "18px", cursor: "pointer",
    position: "relative", userSelect: "none",
  },
  badge: {
    position: "absolute", top: "-6px", right: "-6px",
    background: "#ef4444", color: "white",
    borderRadius: "50%", fontSize: "10px",
    width: "16px", height: "16px",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: "bold",
  },
  dropdown: {
    position: "absolute", top: "30px", right: 0,
    background: "#1a1030", borderRadius: "14px",
    padding: "12px", width: "220px",
    boxShadow: "0 8px 30px rgba(0,0,0,0.5)",
    zIndex: 999, color: "white",
  },
  dropTitle: { fontWeight: "bold", margin: "0 0 8px", fontSize: "14px" },
  empty: { fontSize: "12px", opacity: 0.6, textAlign: "center" },
  inviteCard: {
    background: "rgba(255,255,255,0.08)",
    borderRadius: "10px", padding: "10px",
    marginBottom: "8px",
  },
  inviteName: { margin: "0 0 2px", fontWeight: "bold", fontSize: "13px" },
  inviteFrom: { margin: "0 0 8px", fontSize: "11px", opacity: 0.6 },
  inviteBtns: { display: "flex", gap: "6px" },
  acceptBtn: {
    flex: 1, padding: "6px", borderRadius: "8px",
    border: "none", background: "#6366f1",
    color: "white", cursor: "pointer", fontSize: "12px",
  },
  declineBtn: {
    flex: 1, padding: "6px", borderRadius: "8px",
    border: "none", background: "#ef4444",
    color: "white", cursor: "pointer", fontSize: "12px",
  },
};

export default GroupInvites;