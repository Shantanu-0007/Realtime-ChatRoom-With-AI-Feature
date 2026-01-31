// src/webpage/login.js
import React, { useState } from "react";
import { signup, login, loginWithGoogle } from "./AuthService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      alert("Please enter email and password");
      return;
    }

    try {
      if (isSignup) {
        if (!username.trim()) {
          alert("Username is required");
          return;
        }
        await signup(email, password, username);
        alert("Account created successfully 🎉");
        setIsSignup(false);
      } else {
        await login(email, password);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>

      <div style={styles.loginCard}>
        <h2>{isSignup ? "Create Account" : "Realtime Chatroom"}</h2>

        {isSignup && (
          <input
            type="text"
            placeholder="Username"
            style={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        )}

        <input
          type="email"
          placeholder="Email"
          style={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleSubmit}>
          {isSignup ? "Sign Up" : "Login"}
        </button>

        <div style={{ margin: "10px 0" }}>or</div>

        <button style={styles.googleButton} onClick={handleGoogleSignIn}>
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            style={{ width: "20px", marginRight: "8px" }}
          />
          Sign in with Google
        </button>

        <p>
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <span
            style={styles.signup}
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Sign up"}
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    position: "relative",
    height: "100vh",
    width: "100%",
    background:
      "url('https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=1950&q=80') no-repeat center/cover",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
  },
  loginCard: {
    position: "relative",
    zIndex: 2,
    background: "rgba(255,255,255,0.9)",
    padding: "2rem",
    borderRadius: "16px",
    width: "350px",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },
  button: {
    width: "100%",
    padding: "12px",
    background: "black",
    color: "white",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    marginBottom: "10px",
  },
  signup: {
    color: "#6366f1",
    fontWeight: "bold",
    cursor: "pointer",
  },
  googleButton: {
    width: "100%",
    padding: "10px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    background: "#fff",
    cursor: "pointer",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

export default Login;
