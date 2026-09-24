import { reconcileAnalytics } from "@/lib/analytics-reconcile";
import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { dispatchGAEvents } from "@/lib/ga4";

export const maxDuration = 180;
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization") ?? "";
  const correct = expected ? `Bearer ${expected}` : "";
  const suppliedBytes = Buffer.from(supplied), correctBytes = Buffer.from(correct);
  if (!correct || suppliedBytes.length !== correctBytes.length || !timingSafeEqual(suppliedBytes, correctBytes)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try { await reconcileAnalytics(); await dispatchGAEvents(); }
  catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  return NextResponse.json({ ok: true });
}
