/**
 * Forward ERP activity to WorkflowTech Hub (wftact on Vercel).
 * Add this call after existing spectator / login tracking in auth.service.ts
 */
export async function forwardActivityToHub(input: {
  site: "kiet" | "demo";
  kind: "LOGIN" | "PAGE_VIEW" | "HEARTBEAT" | "LOGOUT";
  userLabel?: string | null;
  portal?: string | null;
  path?: string | null;
  meta?: Record<string, unknown>;
}) {
  const url = process.env.WFTACT_INGEST_URL;
  const key = process.env.WFTACT_INGEST_KEY;
  if (!url || !key) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wftact-key": key
      },
      body: JSON.stringify({
        site: input.site,
        kind: input.kind,
        user_label: input.userLabel ?? undefined,
        portal: input.portal ?? undefined,
        path: input.path ?? undefined,
        meta: input.meta ?? {},
        at: new Date().toISOString()
      })
    });
  } catch {
    // Non-blocking — never break ERP login if hub is down
  }
}
