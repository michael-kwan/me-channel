import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";

function feedProxyPlugin(): Plugin {
  return {
    name: "feed-proxy",
    configureServer(server) {
      server.middlewares.use("/api/feed", async (req, res) => {
        const reqUrl = new URL(req.url!, `http://${req.headers.host}`);
        const feedUrl = reqUrl.searchParams.get("url");

        if (!feedUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing url parameter" }));
          return;
        }

        try {
          const response = await fetch(feedUrl, {
            headers: {
              "User-Agent": "VChannel/1.0",
              Accept:
                "application/rss+xml, application/xml, text/xml, */*",
            },
          });

          if (!response.ok) {
            throw new Error(`Upstream returned HTTP ${response.status}`);
          }

          const text = await response.text();
          res.setHeader("Content-Type", "application/xml; charset=utf-8");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.statusCode = 200;
          res.end(text);
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : "Unknown error";
          res.statusCode = 502;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: message }));
        }
      });
    },
  };
}

export default defineConfig({
  base: "/me-channel/",
  plugins: [react(), feedProxyPlugin()],
});
