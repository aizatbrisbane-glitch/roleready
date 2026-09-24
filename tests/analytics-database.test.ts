import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let db: PGlite;
let n = 1;
const uid = () => `00000000-0000-4000-8000-${String(n++).padStart(12, "0")}`;
async function account(provider = "email", environment = "production", identity: object = { client_id: "123.456", session_id: "789" }) {
  const id = uid();
  await db.query("insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3)", [id, { provider }, { analytics: { environment, identity } }]);
  await db.query("select discover_ga4_accounts($1)", [id]);
  return id;
}
async function observe(id: string, identity: object = {}, claim = false) {
  return db.query("select observe_ga4_signup($1,$2,$3) as claimed", [id, identity, claim]);
}
async function events(id: string) { return (await db.query<{ event_name: string; params: Record<string, unknown>; identity: object }>("select * from ga4_outbox where user_id=$1", [id])).rows; }

beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key, created_at timestamptz default now(), raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}');
    create table public.generated_documents(user_id uuid, document_type text);
    create table public.entitlements(user_id uuid, stripe_payment_id text, valid_from timestamptz);
    insert into auth.users(id) values ('00000000-0000-4000-8000-999999999999');
    insert into generated_documents values ('00000000-0000-4000-8000-999999999999','tailored_resume');`);
  await db.exec(readFileSync(new URL("../supabase/migrations/20260924120000_production_analytics_foundation.sql", import.meta.url), "utf8"));
});
afterAll(async () => { await db.close(); });

describe("account creation, not authentication", () => {
  it("committed email creation is discovered once before confirmation", async () => {
    const id = await account();
    expect(await events(id)).toHaveLength(1);
    await observe(id, {}, true);
    await observe(id, {}, true);
    expect(await events(id)).toHaveLength(1);
  });
  it.each(["email confirmation", "OTP", "retry"])("%s enriches missing identity without another signup", async () => {
    const id = await account("email", "production", {});
    await observe(id, { client_id: "123.456", session_id: "789" });
    await observe(id, { client_id: "123.456", session_id: "790" });
    const rows = await events(id);
    expect(rows).toHaveLength(1);
    expect(rows[0].params.method).toBe("email");
    expect(rows[0].identity).toEqual({ client_id: "123.456", session_id: "789" });
  });
  it("Google callback creates exactly one Google signup from a durable birth record", async () => {
    const id = await account("google", "unset", {});
    expect(await events(id)).toHaveLength(0);
    await observe(id, { client_id: "123.456" }, true);
    await observe(id, { client_id: "123.456" }, true);
    expect(await events(id)).toMatchObject([{ event_name: "sign_up", params: { method: "google" } }]);
  });
  it("a returning pre-rollout user cannot manufacture a signup", async () => {
    await observe("00000000-0000-4000-8000-999999999999", { client_id: "123.456" }, true);
    expect(await events("00000000-0000-4000-8000-999999999999")).toHaveLength(0);
  });
  it("excluded email accounts stay excluded even after a production login", async () => {
    const id = await account("email", "excluded");
    await observe(id, {}, true);
    expect(await events(id)).toHaveLength(0);
  });
  it("identity refresh cannot consume the separate marketing claim", async () => {
    const id = await account();
    await observe(id);
    expect((await observe(id, {}, true)).rows).toEqual([{ claimed: true }]);
    expect((await observe(id, {}, true)).rows).toEqual([{ claimed: false }]);
  });
});

it("first and subsequent analyses are distinguished, including retries", async () => {
  const id = await account();
  for (const key of ["analysis:a", "analysis:a", "analysis:b"]) {
    await db.query("select enqueue_ga4_event($1,'analysis_completed',$2,'{}','{}',now())", [key, id]);
  }
  const rows = (await events(id)).filter(r => r.event_name === "analysis_completed");
  expect(rows.map(r => r.params.is_first_analysis)).toEqual([true, false]);
});
it("historical successful analysis is not recounted as first", async () => {
  const id = "00000000-0000-4000-8000-999999999999";
  await db.query("select enqueue_ga4_event('analysis:old','analysis_completed',$1,'{}','{}',now())", [id]);
  expect((await events(id))[0].params.is_first_analysis).toBe(false);
});
it("transaction IDs deduplicate repeated webhook insertion", async () => {
  const id = await account();
  for (let i = 0; i < 3; i++) await db.query("select enqueue_ga4_event('purchase:cs_live_1','purchase',$1,'{}','{}',now())", [id]);
  expect((await events(id)).filter(r => r.event_name === "purchase")).toHaveLength(1);
});
it("only one delivery worker can claim an event", async () => {
  const id = await account();
  const claim = () => db.query("update ga4_outbox set status='sending' where event_key=$1 and status='pending' returning event_key", [`signup:${id}`]);
  const result = await Promise.all([claim(), claim(), claim()]);
  expect(result.reduce((sum, r) => sum + r.rows.length, 0)).toBe(1);
});
it("authenticated clients cannot insert outbox events or call service RPCs", async () => {
  await db.exec("set role authenticated");
  try {
    await expect(db.exec("select * from ga4_outbox")).rejects.toThrow(/permission denied/);
    await expect(db.exec("select observe_ga4_signup(null,'{}',true)")).rejects.toThrow(/permission denied/);
  } finally { await db.exec("reset role"); }
});

it.each(["email", "google", "guest_checkout"])("%s account creation survives unavailable analytics tables", async (flow) => {
  const id = uid();
  await db.exec("alter table ga4_accounts rename to ga4_accounts_unavailable; alter table ga4_outbox rename to ga4_outbox_unavailable;");
  try {
    await db.query("insert into auth.users(id,raw_app_meta_data,raw_user_meta_data) values($1,$2,$3)", [id, { provider: flow === "google" ? "google" : "email" }, { analytics: { environment: "production", source: flow } }]);
    expect((await db.query("select id from auth.users where id=$1", [id])).rows).toHaveLength(1);
    if (flow === "guest_checkout") {
      await db.query("insert into entitlements values($1,'cs_live_guest',now())", [id]);
      expect((await db.query("select * from entitlements where user_id=$1", [id])).rows).toHaveLength(1);
    }
  } finally { await db.exec("alter table ga4_accounts_unavailable rename to ga4_accounts; alter table ga4_outbox_unavailable rename to ga4_outbox;"); }
  await db.query("select discover_ga4_accounts($1)", [id]);
  expect((await db.query("select * from ga4_accounts where user_id=$1",[id])).rows).toHaveLength(1);
});
it("strict identity allowlist strips PII and forbids direct unfiltered writes", async () => {
  const id = await account("email", "production", { client_id: "123.456", session_id: "789", email: "private@example.invalid", resume: "private content" });
  expect((await events(id))[0].identity).toEqual({ client_id: "123.456", session_id: "789" });
  await expect(db.query("update ga4_accounts set identity=$1 where user_id=$2", [{ email: "private@example.invalid" }, id])).rejects.toThrow(/identity_allowlist/);
  await expect(db.query("update ga4_outbox set identity=$1 where user_id=$2", [{ email: "private@example.invalid" }, id])).rejects.toThrow(/identity_allowlist/);
});
it("marketing claim works with the GA ledger/outbox unavailable and remains idempotent", async () => {
  const id = await account();
  await db.exec("alter table ga4_accounts rename to ga4_accounts_unavailable; alter table ga4_outbox rename to ga4_outbox_unavailable;");
  try {
    expect((await db.query("select claim_signup_marketing($1) as claimed", [id])).rows).toEqual([{claimed:true}]);
    expect((await db.query("select claim_signup_marketing($1) as claimed", [id])).rows).toEqual([{claimed:false}]);
  } finally { await db.exec("alter table ga4_accounts_unavailable rename to ga4_accounts; alter table ga4_outbox_unavailable rename to ga4_outbox;"); }
});
it("resume-tools production signup is discovered and deduplicated", async () => {
  const id = uid();
  await db.query("insert into auth.users(id,raw_user_meta_data) values($1,$2)",[id,{analytics:{environment:"production",source:"resume_tools",identity:{client_id:"123.456"}}}]);
  await db.query("select discover_ga4_accounts($1)",[id]);
  await observe(id); await observe(id);
  expect(await events(id)).toMatchObject([{event_name:"sign_up",params:{method:"email",signup_source:"resume_tools"}}]);
  expect(await events(id)).toHaveLength(1);
});
