export interface TreeNode {
  id: string;
  title: string;
  description: string;
  pubDate: string;
  thumbnail?: string;
  // If this is a sub-feed, feedUrl contains the RSS URL to fetch children
  feedUrl?: string;
  // If this is a playable item, videoUrl contains the direct video/stream URL
  videoUrl?: string;
  // Whether the enclosure is marked playable="true"
  playable: boolean;
  // Children loaded from sub-feed
  children?: TreeNode[];
  // Loading state
  loading?: boolean;
  // Whether children have been fetched
  loaded?: boolean;
}

export interface FeedChannel {
  title: string;
  feedUrl: string;
  children: TreeNode[];
}
