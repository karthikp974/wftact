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

    const { data: recipient } = await sb
      .from("email_recipients")
      .select("id, open_count, follow_up_open_count")
      .eq("id", id)
      .maybeSingle();

    if (recipient) {
      if (kind === "follow_up") {
        await sb.from("email_events").insert({ recipient_id: id, kind: "follow_up_open" });
        await sb
          .from("email_recipients")
          .update({
            follow_up_opened_at: (recipient.follow_up_open_count ?? 0) === 0 ? now : undefined,
            follow_up_last_open_at: now,
            follow_up_open_count: (recipient.follow_up_open_count ?? 0) + 1
          })
          .eq("id", id);
      } else {
        await sb.from("email_events").insert({ recipient_id: id, kind: "open" });
        await sb
          .from("email_recipients")
          .update({
            opened_at: (recipient.open_count ?? 0) === 0 ? now : undefined,
            last_open_at: now,
            open_count: (recipient.open_count ?? 0) + 1
          })
          .eq("id", id);
      }
    }
  } catch {
    // still return pixel
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
