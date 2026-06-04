import "dotenv/config";
import express from "express";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// Briefings are small JSON payloads; cap the body to keep the proxy lean.
app.use(express.json({ limit: "64kb" }));

// Liveness probe — also handy to confirm the proxy is up during dev.
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[flymo] backend listening on http://localhost:${PORT}`);
});
