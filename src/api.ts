import type {
  Briefing,
  BriefError,
  BriefRequest,
  IfFlightImport,
} from "../shared/types.ts";

/** Call the backend proxy to generate a briefing. Throws on any failure. */
export async function generateBriefing(req: BriefRequest): Promise<Briefing> {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as BriefError;
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return (await res.json()) as Briefing;
}

/**
 * Pull flight details from the user's active Infinite Flight session so the
 * form can be pre-filled. Throws with a human-readable message on any failure.
 */
export async function importFromInfiniteFlight(
  username: string,
): Promise<IfFlightImport> {
  const res = await fetch(
    `/api/if/import?username=${encodeURIComponent(username)}`,
  );

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as BriefError;
      if (body?.error) message = body.error;
    } catch {
      // Non-JSON error body — keep the status-based message.
    }
    throw new Error(message);
  }

  return (await res.json()) as IfFlightImport;
}
