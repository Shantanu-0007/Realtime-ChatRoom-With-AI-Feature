import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

import Login from "./webpage/login";
import Groups from "./webpage/group";
import Chatroom from "./webpage/room";

function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  signOut(auth);
}, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div style={{ color: "white" }}>Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Login />;
  }

  // Logged in, no room selected
  if (!room) {
    return <Groups user={user} onSelectRoom={setRoom} />;
  }

  // Inside chat
  return (
    <Chatroom
      user={user}
      room={room}
      onBack={() => setRoom(null)}
    />
  );
}

export default App;
