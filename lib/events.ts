import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { KoalapplyEventType } from "@/types/database";

type EventMetadata = Record<string, string | number | boolean | null | undefined>;

/**
 * Log a Koalapply analytics event via the service role (bypasses RLS).
 * Fire-and-forget: never throws, never blocks the caller.
 * IMPORTANT: metadata must never contain email addresses, resume content,
 * job descriptions, or any other PII — first name and minimal context only.
 */
export async function logEvent(
  eventType: KoalapplyEventType,
  userId: string | null,
  metadata: EventMetadata = {}
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    await admin.from("koalapply_events").insert({
      event_type: eventType,
      user_id: userId,
      metadata,
    });
  } catch {
    // Event logging is non-critical — never propagate errors
  }
}
