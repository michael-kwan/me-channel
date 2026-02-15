import { useState } from "react";
import styles from "./LoginScreen.module.css";

interface LoginScreenProps {
  onLogin: () => void;
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

const AUTH_HASH = import.meta.env.VITE_AUTH_HASH ?? "";

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  // If no auth hash is configured, skip login entirely
  if (!AUTH_HASH) {
    onLogin();
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError(false);
    const hash = await sha256(password);
    if (hash === AUTH_HASH) {
      sessionStorage.setItem("mc-auth", "1");
      onLogin();
    } else {
      setError(true);
      setChecking(false);
    }
  };

  return (
    <div className={styles.container}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.icon}>📺</div>
        <h1 className={styles.title}>Me Channel</h1>
        <input
          className={styles.input}
          type="password"
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <div className={styles.error}>Incorrect password</div>}
        <button className={styles.button} type="submit" disabled={checking}>
          {checking ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
