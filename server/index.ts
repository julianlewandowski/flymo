import "dotenv/config";
import express from "express";
import { handleBrief } from "./brief.ts";
import { handleIfImport } from "./infiniteFlight.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Briefings are small JSON payloads; cap the body to keep the proxy lean.
app.use(express.json({ limit: "64kb" }));

// Liveness probe — also handy to confirm the proxy is up during dev.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Main proxy route: validates inputs, calls Claude, returns the briefing JSON.
app.post("/api/brief", handleBrief);

// Prefill the form from a user's active Infinite Flight session (Live API).
app.get("/api/if/import", handleIfImport);

app.listen(PORT, () => {
  console.log(`[flymo] backend listening on http://localhost:${PORT}`);
});
