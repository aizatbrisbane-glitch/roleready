import { beforeEach, vi } from "vitest";
const state = vi.hoisted(() => ({ tasks: [] as (() => Promise<unknown>)[], unavailable: false }));
vi.mock("next/server", async (original) => {
  const actual = await original<typeof import("next/server")>();
  return { ...actual, after: (task: () => Promise<unknown>) => {
    if (state.unavailable) throw Error("after unavailable");
    state.tasks.push(task);
  } };
});
beforeEach(() => { state.tasks = []; state.unavailable = false; });
export const background = state;
export async function flushAnalytics() { const tasks = state.tasks.splice(0); await Promise.all(tasks.map(task => task())); }
