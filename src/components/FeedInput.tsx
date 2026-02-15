import { useState } from "react";
import styles from "./FeedInput.module.css";

interface FeedInputProps {
  onAdd: (url: string) => void;
  loading: boolean;
}

export default function FeedInput({ onAdd, loading }: FeedInputProps) {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    const fullUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    onAdd(fullUrl);
    setUrl("");
  };

  return (
    <form className={styles.container} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        placeholder="Enter RSS video feed URL..."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />
      <button className={styles.button} type="submit" disabled={loading || !url.trim()}>
        {loading ? "Loading..." : "Add Feed"}
      </button>
    </form>
  );
}
