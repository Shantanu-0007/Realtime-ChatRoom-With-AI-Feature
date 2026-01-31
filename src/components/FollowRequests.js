import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import { listenFollowRequests } from "../functions/listenFollowRequests";
import { acceptFollow, rejectFollow } from "../functions/handleFollowRequest";

function FollowRequests() {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = listenFollowRequests(
      auth.currentUser.uid,
      setRequests
    );

    return () => unsubscribe();
  }, []);

  if (requests.length === 0) return null;

  return (
    <div style={styles.card}>
      <h3>🔔 Follow Requests</h3>

      {requests.map(req => (
        <div key={req.id} style={styles.row}>
          <span>{req.from}</span>

          <div>
            <button
              style={styles.accept}
              onClick={() => acceptFollow(req.id, req.from, req.to)}
            >
              Accept
            </button>

            <button
              style={styles.reject}
              onClick={() => rejectFollow(req.id)}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = {
  card: {
    background: "#fff",
    padding: "12px",
    borderRadius: "12px",
    marginBottom: "12px"
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "8px"
  },
  accept: {
    background: "#22c55e",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    marginRight: "6px",
    cursor: "pointer"
  },
  reject: {
    background: "#ef4444",
    color: "white",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer"
  }
};

export default FollowRequests;
