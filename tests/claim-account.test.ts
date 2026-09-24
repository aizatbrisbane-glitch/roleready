// @vitest-environment jsdom
import { captureGAIdentity } from "../lib/analytics-identity";
import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
const state = vi.hoisted(() => ({ signup: vi.fn(), gtag: vi.fn(), oauth: vi.fn() }));
vi.mock("@/lib/supabase/browser", () => ({ createSupabaseBrowserClient: () => ({ auth: { signUp: state.signup, signInWithOAuth: state.oauth } }) }));
vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => React.createElement("a", { href }, children) }));
import ClaimAccount from "../app/claim-free-account/page";
import ResumeTools from "../app/resume-tools/page";
import { AuthPanel } from "../components/AuthPanel";
import { AnalyticsIdentity } from "../components/AnalyticsIdentity";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

beforeEach(async () => {
  state.signup.mockReset(); state.gtag.mockReset(); state.oauth.mockReset();
  window.koalapplyAnalyticsEnabled = true;
  window.gtag = state.gtag.mockImplementation((cmd, _id, field, callback) => {
    if (cmd === "get") callback(field === "client_id" ? "123.456" : "789");
  });
  await captureGAIdentity();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function fill(form: HTMLFormElement) {
  for (const [selector, value] of [["[autocomplete=given-name]", "Private"], ["[autocomplete=family-name]", "Person"], ["[type=email]", "private@example.com"], ["[autocomplete=new-password]", "password123"]]) {
    fireEvent.change(form.querySelector(selector)!, { target: { value } });
  }
}
const diagnostics = () => state.gtag.mock.calls.filter(([cmd]) => cmd === "event");

it.each([390, 1440])("width %i: both forms track start → confirmation without GA signup or PII", async (width) => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  state.signup.mockResolvedValue({ data: { user: { id: "u", identities: [{ id: "identity" }] }, session: null }, error: null });
  const { container } = render(React.createElement(ClaimAccount));
  const forms = container.querySelectorAll("form");
  expect(forms).toHaveLength(2);
  for (const form of forms) { fill(form); fireEvent.submit(form); }
  await waitFor(() => expect(state.signup).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(diagnostics().filter(([, name]) => name === "signup_confirmation_required")).toHaveLength(2));
  expect(diagnostics().filter(([, name]) => name === "signup_form_started")).toHaveLength(2);
  expect(diagnostics().filter(([, name]) => name === "signup_page_viewed")).toHaveLength(1);
  expect(diagnostics().some(([, name]) => name === "sign_up")).toBe(false);
  expect(JSON.stringify(diagnostics())).not.toMatch(/Private|Person|private@example|password123/);
  expect(state.signup.mock.calls[0][0].options.data.analytics.identity).toMatchObject({ client_id: "123.456", session_id: "789" });
});
it("password validation emits only a fixed error code and does not create an account", async () => {
  const { container } = render(React.createElement(ClaimAccount));
  const form = container.querySelector("form")!;
  fill(form);
  fireEvent.change(form.querySelector("[autocomplete=new-password]")!, { target: { value: "weak" } });
  fireEvent.submit(form);
  await waitFor(() => expect(diagnostics()).toContainEqual(["event", "signup_error", { form_placement: "hero", error_code: "password_policy" }]));
  expect(state.signup).not.toHaveBeenCalled();
});
it("Supabase errors emit no successful signup or confirmation diagnostic", async () => {
  state.signup.mockResolvedValue({ data: {}, error: { message: "Account error with private@example.com" } });
  const { container } = render(React.createElement(ClaimAccount));
  const form = container.querySelector("form")!; fill(form); fireEvent.submit(form);
  await waitFor(() => expect(diagnostics()).toContainEqual(["event", "signup_error", { form_placement: "hero", error_code: "signup_failed" }]));
  expect(JSON.stringify(diagnostics())).not.toContain("private@example.com");
  expect(diagnostics().some(([, name]) => name === "sign_up" || name === "signup_confirmation_required")).toBe(false);
});
it("immediate session sends server observation but no browser GA signup", async () => {
  state.signup.mockResolvedValue({ data: { user: { id: "u" }, session: { user: { id: "u" } } }, error: null });
  const { container } = render(React.createElement(ClaimAccount));
  const form = container.querySelector("form")!; fill(form); fireEvent.submit(form);
  await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/track/signup", expect.any(Object)));
  expect(diagnostics().some(([, name]) => name === "sign_up")).toBe(false);
});

for (const [path, Page] of [["/claim-free-account", ClaimAccount], ["/resume-tools", ResumeTools]] as const) {
  it.each(["reject", "hang"])(path + " immediate signup completes with analytics %s", async failure => {
    window.history.replaceState({}, "", path);
    window.gtag = () => { throw Error("SDK unavailable"); };
    window.fbq = () => { throw Error("Meta unavailable"); };
    state.signup.mockResolvedValue({ data: { user: { id: "u", identities: [{}] }, session: { user: { id: "u" } } }, error: null });
    vi.stubGlobal("fetch", failure === "hang" ? vi.fn(() => new Promise(() => {})) : vi.fn().mockRejectedValue(Error("tracking offline")));
    const { container } = render(React.createElement(Page));
    const form = container.querySelector("form")!; fill(form); fireEvent.submit(form);
    await waitFor(() => expect(state.signup).toHaveBeenCalledTimes(1));
    await waitFor(() => expect((form.querySelector('button[type="submit"]') as HTMLButtonElement).disabled).toBe(false));
    expect(state.signup.mock.calls[0][0].options.data.analytics).toMatchObject({ environment: "production", source: path === "/resume-tools" ? "resume_tools" : "claim_free_account" });
    await new Promise(resolve => setTimeout(resolve, 10));
  });
}

it("Google signup starts when attribution cookie storage throws", async () => {
  const { getByText } = render(React.createElement(AuthPanel));
  vi.spyOn(Document.prototype, "cookie", "get").mockImplementation(() => { throw Error("storage blocked"); });
  fireEvent.click(getByText("Continue with Google"));
  await waitFor(() => expect(state.oauth).toHaveBeenCalledTimes(1));
});
it("root analytics SDK and storage exceptions do not fail rendering", async () => {
  window.gtag = () => { throw Error("SDK offline"); };
  vi.spyOn(Document.prototype, "cookie", "set").mockImplementation(() => { throw Error("storage blocked"); });
  expect(() => render(React.createElement(AnalyticsIdentity, { enabled: false, userId: null }))).not.toThrow();
  expect(() => render(React.createElement(AnalyticsIdentity, { enabled: true, userId: "user" }))).not.toThrow();
  await new Promise(resolve => setTimeout(resolve, 10));
});
