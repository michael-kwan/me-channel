import { useState, useCallback } from "react";
import type { FeedChannel, TreeNode } from "../types";
import { loadChildren } from "../utils/rssParser";
import styles from "./FeedTree.module.css";

interface FeedTreeProps {
  channels: FeedChannel[];
  onChannelsChange: (channels: FeedChannel[]) => void;
  selectedNode: TreeNode | null;
  onSelectNode: (node: TreeNode) => void;
}

export default function FeedTree({
  channels,
  onChannelsChange,
  selectedNode,
  onSelectNode,
}: FeedTreeProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  const toggleExpand = useCallback(
    async (node: TreeNode, channelIdx: number) => {
      const id = node.id;
      const isExpanded = expandedIds.has(id);

      if (isExpanded) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        return;
      }

      // Expand
      setExpandedIds((prev) => new Set(prev).add(id));

      // If it has a feedUrl and hasn't been loaded, fetch children
      if (node.feedUrl && !node.loaded) {
        // Mark loading
        updateNode(channels, channelIdx, node.id, { loading: true });
        onChannelsChange([...channels]);

        try {
          const children = await loadChildren(node);
          updateNode(channels, channelIdx, node.id, {
            children,
            loaded: true,
            loading: false,
          });
          onChannelsChange([...channels]);
        } catch {
          updateNode(channels, channelIdx, node.id, { loading: false });
          onChannelsChange([...channels]);
        }
      }
    },
    [expandedIds, channels, onChannelsChange]
  );

  if (channels.length === 0) {
    return (
      <div className={styles.empty}>Add an RSS video feed to get started</div>
    );
  }

  return (
    <div className={styles.tree}>
      {channels.map((channel, ci) => (
        <ChannelNode
          key={channel.feedUrl}
          channel={channel}
          channelIdx={ci}
          expandedIds={expandedIds}
          selectedNode={selectedNode}
          onToggle={toggleExpand}
          onSelect={onSelectNode}
        />
      ))}
    </div>
  );
}

function ChannelNode({
  channel,
  channelIdx,
  expandedIds,
  selectedNode,
  onToggle,
  onSelect,
}: {
  channel: FeedChannel;
  channelIdx: number;
  expandedIds: Set<string>;
  selectedNode: TreeNode | null;
  onToggle: (node: TreeNode, channelIdx: number) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.node}>
      <div className={styles.row} onClick={() => setExpanded(!expanded)}>
        <span className={styles.arrow}>{expanded ? "▼" : "▶"}</span>
        <span className={styles.icon}>📡</span>
        <span className={styles.label}>{channel.title}</span>
      </div>
      {expanded && (
        <div className={styles.children}>
          {channel.children.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={1}
              channelIdx={channelIdx}
              expandedIds={expandedIds}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TreeNodeRow({
  node,
  depth,
  channelIdx,
  expandedIds,
  selectedNode,
  onToggle,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  channelIdx: number;
  expandedIds: Set<string>;
  selectedNode: TreeNode | null;
  onToggle: (node: TreeNode, channelIdx: number) => void;
  onSelect: (node: TreeNode) => void;
}) {
  const isExpandable = !!node.feedUrl && !node.playable;
  const isPlayable = node.playable || node.videoUrl;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isPlayable) {
      onSelect(node);
    }
    if (isExpandable) {
      onToggle(node, channelIdx);
    }
  };

  const icon = node.loading
    ? "⏳"
    : isPlayable
      ? "🎬"
      : isExpandable
        ? "📁"
        : "📄";

  return (
    <>
      <div
        className={`${styles.row} ${isSelected ? styles.selected : ""} ${isPlayable ? styles.playable : ""}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
      >
        {isExpandable && (
          <span className={styles.arrow}>{isExpanded ? "▼" : "▶"}</span>
        )}
        {!isExpandable && <span className={styles.arrowSpacer} />}
        <span className={styles.icon}>{icon}</span>
        <span className={styles.label}>{node.title}</span>
      </div>
      {isExpanded && hasChildren && (
        <div className={styles.children}>
          {node.children!.map((child) => (
            <TreeNodeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              channelIdx={channelIdx}
              expandedIds={expandedIds}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </>
  );
}

// Mutates the node in-place within the channels tree
function updateNode(
  channels: FeedChannel[],
  channelIdx: number,
  nodeId: string,
  updates: Partial<TreeNode>
) {
  const channel = channels[channelIdx];
  const found = findNode(channel.children, nodeId);
  if (found) {
    Object.assign(found, updates);
  }
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
