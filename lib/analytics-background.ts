import { after } from "next/server";

// Register work only. Neither registration failure nor task failure may escape
// into the business response. Never fall back to executing inline.
export function scheduleAnalytics(work: () => unknown | Promise<unknown>): void {
  try {
    after(async () => {
      try { await work(); }
      catch { console.error("[analytics] Background task failed"); }
    });
  } catch { console.error("[analytics] Background task could not be scheduled"); }
}
