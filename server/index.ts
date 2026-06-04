import "dotenv/config";
import express from "express";
import { handleBrief } from "./brief.ts";

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

app.listen(PORT, () => {
  console.log(`[flymo] backend listening on http://localhost:${PORT}`);
});
