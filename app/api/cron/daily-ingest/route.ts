import { NextResponse } from "next/server";
import { ingest311, ingestRodent, getWatermark, monthsAgoISO } from "@/lib/ingest";
import { getServiceClient } from "@/lib/supabase";

// Daily delta ingest, triggered by Vercel Cron (see vercel.json). Pulls only
// rows newer than the stored per-source watermark, falling back to a 24-month
// window the first time. Protected by a bearer token so it can't be triggered
// anonymously.
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min — Vercel Hobby ceiling.

export async function GET(request: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` when CRON_SECRET
  // is set in the project env. Reject anything that doesn't match.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // Defensive: don't pretend to succeed if the write client can't be built.
  if (!getServiceClient()) {
    return NextResponse.json(
      { ok: false, error: "supabase not configured" },
      { status: 500 },
    );
  }

  const ranAt = new Date().toISOString();
  const log = (msg: string) => console.log(`[cron daily-ingest] ${msg}`);

  try {
    const [wm311, wmRodent] = await Promise.all([
      getWatermark("311"),
      getWatermark("rodent_inspection"),
    ]);
    const fallback = monthsAgoISO(24);

    log(`start — 311 since ${wm311 ?? fallback}, rodent since ${wmRodent ?? fallback}`);

    const p311 = await ingest311({ since: wm311 ?? fallback, log });
    const rodent = await ingestRodent({ since: wmRodent ?? fallback, log });

    log(`done — 311 upserted ${p311.upserted}, rodent upserted ${rodent.upserted}`);

    return NextResponse.json({ ok: true, ranAt, p311, rodent });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`FATAL: ${message}`);
    return NextResponse.json({ ok: false, ranAt, error: message }, { status: 500 });
  }
}
