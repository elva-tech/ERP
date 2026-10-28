// DEMO ONLY. Starts the normal Vite dev server with the temporary demo API mounted at /demo-api.
// Run from apps/frontend/procurement-module:  npx vite --config dev-demo/vite.demo.config.mjs
// Production (`npm run build`) and the normal `npm run dev` do not use this file.
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vite";
import baseConfig from "../vite.config.js";
import { createDemoApi } from "./api/handler.mjs";

export const DEMO_API_PATH = "/demo-api";
const DEMO_PORT = Number(process.env.DEMO_PORT) || 5299;

// Variables already present in process.env take precedence over any .env file, so a developer's
// .env.local (pointing at a real backend) cannot leak into the demo session.
process.env.VITE_API_BASE_URL = DEMO_API_PATH;

const DEMO_BANNER_STYLE = [
  "position:fixed", "right:12px", "bottom:12px", "z-index:2147483647", "pointer-events:none",
  "padding:6px 10px", "border-radius:6px", "background:#b45309", "color:#fff",
  "font:600 11px/1.3 system-ui,sans-serif", "box-shadow:0 2px 8px rgba(0,0,0,.25)", "letter-spacing:.02em",
].join(";");

function demoApiPlugin() {
  return {
    name: "elva-procurement-demo-api",
    apply: "serve",
    configureServer(server) {
      const handler = createDemoApi({ latencyMs: Number(process.env.DEMO_LATENCY_MS ?? 250) });
      server.middlewares.use(DEMO_API_PATH, (req, res) => {
        handler(req, res);
      });
      server.httpServer?.once("listening", () => {
        server.config.logger.info(
          `\n  DEMO MODE: sample data served from ${DEMO_API_PATH} (in memory, resets on restart).` +
            `\n  Reset data: http://localhost:${DEMO_PORT}${DEMO_API_PATH}/__demo/reset\n`,
        );
      });
    },
    transformIndexHtml() {
      return [
        {
          tag: "div",
          attrs: { role: "status", "aria-label": "Demo mode", style: DEMO_BANNER_STYLE },
          children: "DEMO MODE · sample data only, not real records · sign in: demo / demo123",
          injectTo: "body",
        },
      ];
    },
  };
}

export default mergeConfig(baseConfig, {
  root: fileURLToPath(new URL("..", import.meta.url)),
  plugins: [demoApiPlugin()],
  server: { port: DEMO_PORT, strictPort: true },
  cacheDir: fileURLToPath(new URL("../node_modules/.vite-demo", import.meta.url)),
});
