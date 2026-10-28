// DEMO ONLY. Optional standalone demo API (no frontend), useful for curl checks.
// Run from apps/frontend/procurement-module:  node dev-demo/server.mjs
import { createServer } from "node:http";
import { createDemoApi } from "./api/handler.mjs";

const PORT = Number(process.env.DEMO_API_PORT) || 4599;
const PREFIX = "/demo-api";
const handler = createDemoApi({ latencyMs: Number(process.env.DEMO_LATENCY_MS ?? 0) });

createServer((req, res) => {
  if (!req.url?.startsWith(PREFIX)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end(`Demo API is served under ${PREFIX}`);
    return;
  }
  req.url = req.url.slice(PREFIX.length) || "/";
  handler(req, res);
}).listen(PORT, "127.0.0.1", () => {
  console.log(`DEMO API (sample data, in memory) listening on http://127.0.0.1:${PORT}${PREFIX}`);
});
