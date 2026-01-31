import React, { useEffect, useState } from "react";
import { searchUsers } from "../functions/searchUsers";
import { sendFollowRequest } from "../functions/sendFollowRequest";
import { auth, db } from "../firebase";
import { FaTimes, FaUserPlus, FaCheck } from "react-icons/fa";
import { acceptFollow, rejectFollow } from "../functions/acceptFollow";
import { unfollowUser } from "../functions/unfollowUser";
import { FaUserMinus } from "react-icons/fa";


import {
  collection,
  query,
  where,
  onSnapshot,
  doc
} from "firebase/firestore";

function SearchUsers({ onClose }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [requested, setRequested] = useState({});
  const [incomingRequests, setIncomingRequests] = useState({});
  const [following, setFollowing] = useState([]);

  const currentUser = auth.currentUser || null;

  // 🔹 Load following list
  useEffect(() => {
  if (!currentUser) return;

  const unsubscribe = onSnapshot(
    doc(db, "users", currentUser.uid),
    (snap) => {
      if (snap.exists()) {
        setFollowing(snap.data().following || []);
      } else {
        setFollowing([]);
      }
    }
  );

  return unsubscribe;
  }, [currentUser]);


  useEffect(() => {
  if (!currentUser) return;

  const q = query(
    collection(db, "followRequests"),
    where("from", "==", currentUser.uid),
    where("status", "==", "pending")
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    const map = {};
    snap.forEach((d) => {
      map[d.data().to] = true;
    });
    setRequested(map);
  });

  return unsubscribe;
  }, [currentUser]);


  // 🔹 Listen for incoming follow requests (REALTIME)
  useEffect(() => {
  if (!currentUser) return;

  const q = query(
    collection(db, "followRequests"),
    where("to", "==", currentUser.uid),
    where("status", "==", "pending")
  );

  const unsubscribe = onSnapshot(q, (snap) => {
    const map = {};
    snap.forEach((d) => {
      map[d.data().from] = d.id;
    });
    setIncomingRequests(map);
  });

  return unsubscribe;
  }, [currentUser]);


  // 🔹 Load users initially
  useEffect(() => {
  if (!currentUser) return;

  const loadUsers = async () => {
    const users = await searchUsers("");
    setResults(users.filter((u) => u.id !== currentUser.uid));
    setHasSearched(true);
  };

  loadUsers();
  }, [currentUser]);


  const handleSearch = async () => {
  if (!text.trim() || !currentUser) return;
  setHasSearched(true);
  const users = await searchUsers(text);
  setResults(users.filter((u) => u.id !== currentUser.uid));
  };

  const handleFollow = async (id) => {
  if (!currentUser) return;
  await sendFollowRequest(id);
  setRequested((prev) => ({ ...prev, [id]: true }));
  };


  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />

      <div style={styles.modal}>
        <div style={styles.header}>
          <h3>Find People</h3>
          <FaTimes onClick={onClose} style={{ cursor: "pointer" }} />
        </div>

        <input
          style={styles.input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Search by username or email"
        />

        <button style={styles.searchBtn} onClick={handleSearch}>
          Search
        </button>

        {hasSearched && results.length === 0 && (
          <p style={styles.empty}>No users found</p>
        )}

        {results.map((u) => (
          <div key={u.id} style={styles.userRow}>
            <div style={styles.userInfo}>
              <div style={styles.avatar}>
                {u.username?.charAt(0).toUpperCase() || "U"}
              </div>
              <span>{u.username || u.email}</span>
            </div>

            {/* ✅ Already connected */}
            {following.includes(u.id) ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <button style={styles.connected} disabled>
              ✓ Connected
            </button>

            <button
            style={styles.unfollow}
            onClick={async () => {
             await unfollowUser(u.id);

            setFollowing((prev) =>
              prev.filter((id) => id !== u.id)
            );
           }}
            >
            <FaUserMinus />
            </button>
            </div>
            ): incomingRequests[u.id] ? (
              // ✅ Incoming request → Accept / Reject
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  style={{ ...styles.followBtn, background: "#22c55e" }}
                  onClick={async () => {
                    await acceptFollow(
                      incomingRequests[u.id],
                      u.id,
                      currentUser.uid
                    );

                    setFollowing((prev) => [...prev, u.id]);

                    setIncomingRequests((prev) => {
                      const copy = { ...prev };
                      delete copy[u.id];
                      return copy;
                    });
                  }}
                >
                  Accept
                </button>

                <button
                  style={{ ...styles.followBtn, background: "#ef4444" }}
                  onClick={async () => {
                    await rejectFollow(incomingRequests[u.id]);

                    setIncomingRequests((prev) => {
                      const copy = { ...prev };
                      delete copy[u.id];
                      return copy;
                    });
                  }}
                >
                  Reject
                </button>
              </div>
            ) : (
              // ✅ Normal follow / requested
              <button
                style={{
                  ...styles.followBtn,
                  ...(requested[u.id] ? styles.requested : {}),
                }}
                disabled={requested[u.id]}
                onClick={() => handleFollow(u.id)}
              >
                {requested[u.id] ? (
                  <>
                    <FaCheck /> Requested
                  </>
                ) : (
                  <>
                    <FaUserPlus /> Follow
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>
    </>
  );
}


const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(3px)",
    zIndex: 10,
  },
  modal: {
    position: "fixed",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: "linear-gradient(145deg, #111, #1a1a1a)",
    color: "white",
    padding: "20px",
    borderRadius: "16px",
    width: "300px",
    zIndex: 11,
    boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  title: {
    margin: 0,
  },
  closeIcon: {
    cursor: "pointer",
    fontSize: "18px",
    opacity: 0.8,
  },
  input: {
  width: "100%",
  padding: "12px 14px",
  boxSizing: "border-box",
  borderRadius: "12px",
  border: "none",
  outline: "none",
  fontSize: "14px",
  marginBottom: "12px",
  },
  searchBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "10px",
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #4f46e5)",
    color: "white",
    cursor: "pointer",
    marginBottom: "10px",
  },
  empty: {
    textAlign: "center",
    opacity: 0.6,
    fontSize: "14px",
  },
  userRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
  },
  followBtn: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    padding: "6px 10px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    fontSize: "12px",
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    color: "white",
  },
  requested: {
    background: "linear-gradient(135deg, #6b7280, #4b5563)",
    cursor: "default",
  },
  connected: {
  background: "#2563eb",
  color: "white",
  border: "none",
  padding: "6px 10px",
  borderRadius: "8px",
  fontSize: "12px",
  cursor: "default",
  },

  unfollow: {
  background: "#ef4444",
  color: "white",
  border: "none",
  padding: "6px",
  borderRadius: "50%",
  fontSize: "11px",
  cursor: "pointer",
},

};

export default SearchUsers;
