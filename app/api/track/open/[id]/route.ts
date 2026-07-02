import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/** 1x1 transparent GIF */
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  try {
    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();

    const { data: recipient } = await sb
      .from("email_recipients")
      .select("id, open_count")
      .eq("id", id)
      .maybeSingle();

    if (recipient) {
      await sb.from("email_events").insert({ recipient_id: id, kind: "open" });
      await sb
        .from("email_recipients")
        .update({
          opened_at: recipient.open_count === 0 ? now : undefined,
          last_open_at: now,
          open_count: (recipient.open_count ?? 0) + 1
        })
        .eq("id", id);
    }
  } catch {
    // Still return pixel even if logging fails
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
