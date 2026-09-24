import { flushAnalytics, background } from "./background-harness";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  documentFailure: false, updateFailure: false, aiFailure: false,
  events: vi.fn(), consume: vi.fn(),
}));
vi.mock("@/lib/ga4", () => ({ recordGAEvent: state.events }));
vi.mock("@/lib/events", () => ({ logEvent: vi.fn() }));
vi.mock("@/lib/limit-email", () => ({ sendLimitReachedEmail: vi.fn() }));
vi.mock("@/lib/entitlements", () => ({
  getAccessState: async () => ({ canGenerate: true, planType: "focus_30_day", applicationsRemaining: 10 }),
  consumeGenerationCredit: state.consume, generationLimitMessage: () => "limit",
}));
vi.mock("openai", () => ({ default: class {
  responses = { create: async () => {
    if (state.aiFailure) throw Error("generation failed");
    return { output_text: JSON.stringify({ matchScore: 70, matchExplanation: "match", missingKeywords: [], keywordsAddressed: [], keywordImportance: {}, tailoredResume: "Resume", coverLetter: "Letter" }) };
  } };
} }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "user", email: "private@example.com" } } }) },
  from: (table: string) => {
    let write = false;
    const result = () => {
      if (write) return { error: table === "generated_documents" && state.documentFailure || table === "applications" && state.updateFailure ? { message: "write failed" } : null };
      const records: Record<string, unknown> = {
        applications: { id: "application", generated_at: null, jobs: { title: "Engineer", description: "Relevant job description. ".repeat(10), job_url: "" } },
        profiles: { name: "Private name" }, master_resumes: { resume_text: "Private resume" }, master_cover_letters: null,
      };
      return { data: records[table] ?? null, error: null };
    };
    const chain = {
      select: () => chain, eq: () => chain, order: () => chain, limit: () => chain,
      update: () => { write = true; return chain; }, insert: () => { write = true; return chain; },
      maybeSingle: async () => result(), then: (resolve: (r: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return chain;
  },
}) }));

import { POST } from "../app/api/applications/[id]/generate/route";
const generateResponse = () => POST(new Request("https://www.koalapply.com/api/applications/application/generate", { method: "POST", body: JSON.stringify({ provider: "openai" }) }), { params: Promise.resolve({ id: "application" }) });
const generate = async () => { const response = await generateResponse(); await flushAnalytics(); return response; };

beforeEach(() => {
  vi.stubEnv("OPENAI_API_KEY", "test"); state.events.mockReset(); state.consume.mockReset().mockResolvedValue({ ok: true });
  state.aiFailure = false; state.documentFailure = false; state.updateFailure = false;
});
afterEach(() => vi.unstubAllEnvs());

it.each(["aiFailure", "updateFailure", "documentFailure"] as const)("%s produces no completion event", async (failure) => {
  state[failure] = true;
  const response = await generate();
  expect(response.ok).toBe(false);
  expect(state.events).not.toHaveBeenCalled();
});
it("failed credit recording does not emit completion", async () => {
  state.consume.mockResolvedValue({ ok: false, error: "failed" });
  expect((await generate()).ok).toBe(false);
  expect(state.events).not.toHaveBeenCalled();
});
it("persisted generation emits analysis and both document types without content", async () => {
  expect((await generate()).status).toBe(200);
  expect(state.events.mock.calls.map(([e]) => e.name)).toEqual(["analysis_completed", "document_generated", "document_generated"]);
  expect(state.events.mock.calls.slice(1).map(([e]) => e.params.document_type)).toEqual(["tailored_resume", "cover_letter"]);
  expect(JSON.stringify(state.events.mock.calls)).not.toMatch(/Private|private@example/);
  expect(state.consume).toHaveBeenCalledTimes(1);
});

it.each(["reject", "hang", "scheduler unavailable"])("generate succeeds without waiting for analytics: %s", async (failure) => {

  const telemetry = state.events;
  if (failure === "reject") telemetry.mockRejectedValue(Error("analytics unavailable"));
  if (failure === "hang") telemetry.mockImplementation(() => new Promise(() => {}));
  background.unavailable = failure === "scheduler unavailable";
  const response = await generateResponse();
  expect(response.status).toBe(200);
  expect(telemetry).not.toHaveBeenCalled();

  expect(state.consume).toHaveBeenCalledTimes(1);
  if (failure === "reject") await flushAnalytics();
  if (failure === "hang") { void flushAnalytics(); await Promise.resolve(); }
});
