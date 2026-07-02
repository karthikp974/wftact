import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin, verifyIngestKey } from "@/lib/supabase";

type IngestBody = {
  site: string;
  kind: string;
  user_label?: string;
  portal?: string;
  path?: string;
  meta?: Record<string, unknown>;
  at?: string;
};

export async function POST(request: NextRequest) {
  if (!verifyIngestKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: IngestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const site = body.site?.trim();
  const kind = body.kind?.trim();
  if (!site || !kind) {
    return NextResponse.json({ error: "site and kind required" }, { status: 400 });
  }

  const allowed = new Set(["kiet", "demo", "main"]);
  if (!allowed.has(site)) {
    return NextResponse.json({ error: "Invalid site key" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { error } = await sb.from("activity_events").insert({
    site_key: site,
    kind,
    user_label: body.user_label?.trim() || null,
    portal: body.portal?.trim() || null,
    path: body.path?.trim() || null,
    meta: body.meta ?? {},
    created_at: body.at ?? new Date().toISOString()
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
