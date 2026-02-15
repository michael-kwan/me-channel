import type { TreeNode } from "../types";
import styles from "./VideoPlayer.module.css";

interface VideoPlayerProps {
  node: TreeNode | null;
}

export default function VideoPlayer({ node }: VideoPlayerProps) {
  if (!node) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.placeholderIcon}>📺</div>
        <div className={styles.placeholderText}>
          Select a video from the sidebar to start playing
        </div>
      </div>
    );
  }

  // Determine if this is an embeddable video page or a direct video URL
  const url = node.videoUrl ?? "";
  const isDirectVideo = /\.(mp4|m3u8|webm|mkv|avi)(\?|$)/i.test(url);

  return (
    <div className={styles.container}>
      <div className={styles.videoWrapper}>
        {isDirectVideo ? (
          <video
            className={styles.video}
            src={url}
            controls
            autoPlay
            key={url}
          />
        ) : (
          <iframe
            className={styles.video}
            src={url}
            key={url}
            allowFullScreen
            allow="autoplay; fullscreen"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />
        )}
      </div>
      <div className={styles.info}>
        <h2 className={styles.title}>{node.title}</h2>
        {node.pubDate && (
          <div className={styles.date}>
            {new Date(node.pubDate).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        )}
      </div>
    </div>
  );
}
