import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";

function UserConnections() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      setUser(docSnap.data());
    });

    return () => unsub();
  }, []);

  if (!user) return <p>Loading...</p>;

  return (
    <div style={styles.card}>
      <h3>Your Connections</h3>

      <h4>Followers:</h4>
      {user.followers.length === 0 ? <p>None</p> :
        user.followers.map(id => <p key={id}>{id}</p>)
      }

      <h4>Following:</h4>
      {user.following.length === 0 ? <p>None</p> :
        user.following.map(id => <p key={id}>{id}</p>)
      }
    </div>
  );
}

const styles = {
  card: {
    padding: "20px",
    background: "#fff",
    borderRadius: "12px",
    width: "400px",
    margin: "20px auto",
    boxShadow: "0 0 10px rgba(0,0,0,0.1)",
  },
};

export default UserConnections;
