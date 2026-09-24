import { background, flushAnalytics } from "./background-harness";
import { beforeEach, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ events: vi.fn(), writes: vi.fn(), uploads: vi.fn() }));
vi.mock("@/lib/ga4", () => ({ recordGAEvent: state.events }));
vi.mock("@/lib/events", () => ({ logEvent: state.events }));
vi.mock("@/lib/file-text", () => ({ extractTextFromFile: async () => "Resume text" }));
vi.mock("@/lib/job-ad", () => ({ normaliseJobUrl: (v: string) => v, detectJobSource: () => "Manual", isBlockedJobBoard: () => false, isSearchResultsPage: () => false, fetchJobAdDetails: async () => ({ description: "Job text" }) }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
  storage: { from: () => ({ upload: async (...args: unknown[]) => { state.uploads(...args); return { error: null }; } }) },
  from: (table: string) => {
    const q = { select: () => q, eq: () => q, not: () => q, order: () => q, limit: () => q, delete: () => q,
      insert: (v: unknown) => { state.writes(table, v); return q; },
      single: async () => ({ data: { id: table + "-id" }, error: null }),
      maybeSingle: async () => ({ data: { name: "Private name" }, error: null }),
      then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve),
    }; return q;
  },
}) }));
import { POST as upload } from "../app/api/profile/documents/route";
import { POST as job } from "../app/api/jobs/route";
import { POST as quickStart } from "../app/api/quick-start/route";
import { POST as importedJob } from "../app/api/grab/import/route";
beforeEach(() => { state.events.mockReset(); state.writes.mockClear(); state.uploads.mockClear(); });
const operations = ["resume upload", "manual job", "quick-start", "imported job"] as const;
async function operate(operation: typeof operations[number]) {
  const form = new FormData();
  form.set("description", "Job description"); form.set("job_description_fallback", "Job description");
  if (operation === "resume upload" || operation === "quick-start") form.set("resume_file", new File(["resume"], "resume.txt", { type: "text/plain" }));
  if (operation === "imported job") return importedJob(new Request("https://www.koalapply.com/api/grab/import", { method: "POST", body: JSON.stringify({ title: "Job", description: "Job description", jobUrl: "" }) }));
  return ({ "resume upload": upload, "manual job": job, "quick-start": quickStart })[operation](new Request("https://www.koalapply.com/api/test", { method: "POST", body: form }));
}
for (const operation of operations) {
  it.each(["reject", "hang", "scheduler unavailable"])(operation + " succeeds with analytics %s", async (failure) => {
    if (failure === "reject") state.events.mockRejectedValue(Error("analytics unavailable"));
    if (failure === "hang") state.events.mockImplementation(() => new Promise(() => {}));
    background.unavailable = failure === "scheduler unavailable";
    const response = await operate(operation);
    expect(response.status).toBe(200);
    expect(state.events).not.toHaveBeenCalled();
    expect(state.writes).toHaveBeenCalled();
    if (operation === "resume upload" || operation === "quick-start") expect(state.uploads).toHaveBeenCalledTimes(1);
    if (failure === "reject") await flushAnalytics();
    if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
  });
  it(operation + " still records its funnel event after a successful response", async () => {
    const response = await operate(operation); expect(response.status).toBe(200);
    expect(state.events).not.toHaveBeenCalled();
    await flushAnalytics();
    expect(state.events).toHaveBeenCalledWith(expect.objectContaining({ name: operation === "resume upload" ? "resume_uploaded" : "job_added" }));
  });
}
