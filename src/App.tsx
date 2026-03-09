import { useState, useEffect, useCallback } from "react";
import type { FeedChannel, TreeNode } from "./types";
import { fetchAndParseRoot } from "./utils/rssParser";
import FeedInput from "./components/FeedInput";
import FeedTree from "./components/FeedTree";
import VideoPlayer from "./components/VideoPlayer";
import LoginScreen from "./components/LoginScreen";
import styles from "./App.module.css";

const AUTH_HASH = import.meta.env.VITE_AUTH_HASH ?? "";

const STORAGE_KEY = "vchannel-feeds";

function loadSavedFeeds(): FeedChannel[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return [];
}

function saveFeeds(channels: FeedChannel[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(channels));
  } catch {
    // ignore quota errors
  }
}

function isAuthed(): boolean {
  return !AUTH_HASH || sessionStorage.getItem("mc-auth") === "1";
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthed);
  const [channels, setChannels] = useState<FeedChannel[]>(loadSavedFeeds);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Persist channels to localStorage whenever they change
  useEffect(() => {
    saveFeeds(channels);
  }, [channels]);

  const handleAddFeed = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      const channel = await fetchAndParseRoot(url);
      if (channel.children.length === 0) {
        setError("No items found in this feed.");
        return;
      }
      setChannels((prev) => [...prev, channel]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  };

  const handleChannelsChange = useCallback((updated: FeedChannel[]) => {
    setChannels(updated);
  }, []);

  const handleRefreshChannel = useCallback(async (channelIdx: number) => {
    const channel = channels[channelIdx];
    if (!channel) return;
    const refreshed = await fetchAndParseRoot(channel.feedUrl);
    setChannels((prev) => {
      const next = [...prev];
      next[channelIdx] = refreshed;
      return next;
    });
  }, [channels]);

  if (!authed) {
    return <LoginScreen onLogin={() => setAuthed(true)} />;
  }

  return (
    <div className={styles.app}>
      <FeedInput onAdd={handleAddFeed} loading={loading} />
      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button className={styles.errorClose} onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      <div className={styles.main}>
        <div className={styles.sidebar}>
          <FeedTree
            channels={channels}
            onChannelsChange={handleChannelsChange}
            onRefreshChannel={handleRefreshChannel}
            selectedNode={selectedNode}
            onSelectNode={setSelectedNode}
          />
        </div>
        <div className={styles.content}>
          <VideoPlayer node={selectedNode} />
        </div>
      </div>
    </div>
  );
}
