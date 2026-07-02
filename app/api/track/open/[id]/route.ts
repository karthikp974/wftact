import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const kind = request.nextUrl.searchParams.get("kind") ?? "open";

  try {
    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: recipient, error: loadErr } = await sb
      .from("email_recipients")
      .select("id, open_count, follow_up_open_count, nurture_open_count")
      .eq("id", id)
      .maybeSingle();

    if (loadErr) throw loadErr;

    if (recipient) {
      if (kind === "nurture") {
        await sb.from("email_events").insert({ recipient_id: id, kind: "nurture_open" });
        const patch: Record<string, string | number> = {
          nurture_last_open_at: now,
          nurture_open_count: (recipient.nurture_open_count ?? 0) + 1
        };
        if ((recipient.nurture_open_count ?? 0) === 0) {
          patch.nurture_opened_at = now;
        }
        await sb.from("email_recipients").update(patch).eq("id", id);
      } else if (kind === "follow_up") {
        await sb.from("email_events").insert({ recipient_id: id, kind: "follow_up_open" });
        const patch: Record<string, string | number> = {
          follow_up_last_open_at: now,
          follow_up_open_count: (recipient.follow_up_open_count ?? 0) + 1
        };
        if ((recipient.follow_up_open_count ?? 0) === 0) {
          patch.follow_up_opened_at = now;
        }
        await sb.from("email_recipients").update(patch).eq("id", id);
      } else {
        await sb.from("email_events").insert({ recipient_id: id, kind: "open" });
        const patch: Record<string, string | number> = {
          last_open_at: now,
          open_count: (recipient.open_count ?? 0) + 1
        };
        if ((recipient.open_count ?? 0) === 0) {
          patch.opened_at = now;
        }
        await sb.from("email_recipients").update(patch).eq("id", id);
      }
    }
  } catch (e) {
    console.error("[track/open]", e);
  }

  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      Pragma: "no-cache",
      Expires: "0"
    }
  });
}
