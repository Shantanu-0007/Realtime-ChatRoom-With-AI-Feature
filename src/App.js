import React, { useState } from "react";
import Login from "./webpage/login";
import Chatroom from "./webpage/room";
import Groups from "./webpage/group";

function App() {
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);

  if (!user) return <Login onLogin={setUser} />;
  if (!room) return <Groups onSelectRoom={setRoom} />;
  return <Chatroom user={user} room={room} onBack={() => setRoom(null)} />;
}

export default App;
