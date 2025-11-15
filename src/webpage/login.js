import React, { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

function Login({ onLogin = () => {} }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) {
      alert("Please enter both email and password!");
      return;
    }

    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert(`Account created for ${email}! 🎉`);
        setIsSignup(false);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin(email);
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      onLogin(user.email);
      alert(`Welcome ${user.displayName || user.email}!`);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.overlay}></div>
      <div style={styles.loginCard}>
        <h2>{isSignup ? "Create Account" : "Realtime Chatroom"}</h2>

        <input
          type="text"
          style={styles.input}
          placeholder="Email"
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

        {isSignup && (
          <input
            type="password"
            placeholder="Confirm Password"
            style={styles.input}
          />
        )}

        <button style={styles.button} onClick={handleSubmit}>
          {isSignup ? "Sign Up" : "Login"}
        </button>

        {/* ---- Google Sign-In ---- */}
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
      "url('https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?auto=format&fit=crop&w=1950&q=80') no-repeat center center/cover",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
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
    boxShadow: "0 8px 25px rgba(0,0,0,0.2)",
    animation: "fadeIn 1s ease-out",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    outline: "none",
    transition: "border 0.2s",
  },
  signup: {
    color: "#6366f1",
    fontWeight: "bold",
    cursor: "pointer",
  },
  button: {
    width: "100%",
    padding: "12px 40px",
    color: "white",
    background: "black",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginBottom: "10px",
  },
  googleButton: {
    width: "100%",
    padding: "10px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Login;
