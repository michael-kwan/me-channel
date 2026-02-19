import type { TreeNode, FeedChannel } from "../types";

function getText(el: Element, tag: string): string {
  const node = el.querySelector(tag);
  return node?.textContent?.trim() ?? "";
}

function extractThumbnail(item: Element): string | undefined {
  // Try itunes:image
  const itunesImg = item.querySelector("image");
  if (itunesImg?.getAttribute("href")) return itunesImg.getAttribute("href")!;

  // Try extracting from description CDATA <img src="...">
  const desc = getText(item, "description");
  const match = desc.match(/<img\s+src='([^']+)'/);
  if (match) return match[1];

  return undefined;
}

let nodeIdCounter = 0;

const isDev = import.meta.env.DEV;

const PROD_PROXIES: Array<(url: string) => string> = [
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchRaw(feedUrl: string): Promise<string> {
  if (isDev) {
    const proxyUrl = `/api/feed?url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch feed: ${response.statusText}`);
    }
    return response.text();
  }

  let lastError: Error = new Error("All CORS proxies failed");
  for (const makeProxy of PROD_PROXIES) {
    try {
      const res = await fetch(makeProxy(feedUrl));
      if (res.ok) return res.text();
      lastError = new Error(`Proxy returned HTTP ${res.status}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError;
}

export async function fetchFeed(feedUrl: string): Promise<{ title: string; nodes: TreeNode[] }> {
  const xmlText = await fetchRaw(feedUrl);
  if (!xmlText.trim()) {
    throw new Error("Empty response from feed");
  }
  return parseFeedXml(xmlText);
}

export function parseFeedXml(xmlText: string): { title: string; nodes: TreeNode[] } {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  const errorNode = doc.querySelector("parsererror");
  if (errorNode) {
    throw new Error("Invalid RSS XML");
  }

  const channel = doc.querySelector("channel");
  if (!channel) {
    throw new Error("No <channel> found in RSS feed");
  }

  const channelTitle = getText(channel, "title");
  const nodes: TreeNode[] = [];

  // Only get direct child <item> elements of <channel>
  const items = channel.querySelectorAll(":scope > item");

  items.forEach((item) => {
    const enclosure = item.querySelector("enclosure");
    const enclosureUrl = enclosure?.getAttribute("url") ?? "";
    const enclosureType = enclosure?.getAttribute("type") ?? "";
    const playable = enclosure?.getAttribute("playable") === "true";
    const isSubFeed = enclosureType === "application/rss+xml";

    const title = getText(item, "title") || "Untitled";
    const description = getText(item, "description");
    const pubDate = getText(item, "pubDate");
    const thumbnail = extractThumbnail(item);

    const node: TreeNode = {
      id: `node-${nodeIdCounter++}`,
      title,
      description,
      pubDate,
      thumbnail,
      playable,
      ...(isSubFeed && !playable
        ? { feedUrl: enclosureUrl }
        : {}),
      ...(isSubFeed && playable
        ? {
            // Playable rss+xml items: the URL without xml=1 is an embeddable video page
            videoUrl: enclosureUrl
              .replace(/([?&])xml=1(&?)/, (_, p, a) => a ? p : "")
              .replace(/([?&])title=[^&]*(&?)/, (_, p, a) => a ? p : ""),
          }
        : {}),
      ...(!isSubFeed && enclosureUrl
        ? { videoUrl: enclosureUrl }
        : {}),
    };

    nodes.push(node);
  });

  return { title: channelTitle || "Untitled Feed", nodes };
}

export async function fetchAndParseRoot(feedUrl: string): Promise<FeedChannel> {
  const { title, nodes } = await fetchFeed(feedUrl);
  return { title, feedUrl, children: nodes };
}

export async function loadChildren(node: TreeNode): Promise<TreeNode[]> {
  if (!node.feedUrl) return [];
  const { nodes } = await fetchFeed(node.feedUrl);
  return nodes;
}
