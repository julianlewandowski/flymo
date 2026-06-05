# Infinite Flight Live API — key request

The "Pull from Infinite Flight" feature needs a Live API key. Infinite Flight
issues keys by request; email `hello@infiniteflight.com` describing what you're
building. Draft below — fill in the bracketed bits before sending.

---

**To:** hello@infiniteflight.com
**Subject:** Live API key request — flymo (flight-sim performance briefings)

Hi Infinite Flight team,

I'd like to request a Live API key.

**What I'm building:** flymo, a small web app that generates a takeoff-to-landing
performance briefing (V-speeds, thrust/flex, climb/cruise/descent profiles,
approach numbers) for flight-sim use. It's clearly labelled sim-only and is not
for real-world navigation.

**How I'd use the Live API:** purely to reduce manual data entry. When a user
enters their IFC username, I look up their *active* flight to prefill the
briefing form — reading the flight plan (for departure/arrival), the
aircraft/livery, and the departure/arrival ATIS (for wind, temperature, and
active runway). Endpoints I expect to call: `GET /sessions`,
`GET /sessions/{id}/flights`, `GET /sessions/{id}/flights/{flightId}/flightplan`,
`GET /sessions/{id}/airport/{icao}/atis`, `GET /aircraft`, and
`GET /aircraft/liveries`.

**Volume:** low — a handful of requests per briefing, only on explicit user
action (a "Pull from Infinite Flight" button). Aircraft/livery catalogs are
cached. No polling.

**Distribution:** [self-hosted / personal project / link if public]. The key
lives only on the backend and is never exposed to the browser.

Happy to share more detail or a demo. Thanks!

[Your name]
[IFC username]
[Contact email]
