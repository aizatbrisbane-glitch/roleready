"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { KoalapplyEvent, KoalapplyEventType } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  plan: string | null;
  joined: string;
};

export type PanelConfig =
  | { kind: "users"; filter: "all" | "today" | "week" | "paid"; title: string }
  | { kind: "events"; type: KoalapplyEventType; title: string }
  | null;

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  sprint_7_day:      "Sprint 7-day",
  focus_30_day:      "Focus 30-day",
  partner_90_day:    "Partner 90-day",
  enterprise_90_day: "Enterprise",
};

const EVENT_LABELS: Partial<Record<KoalapplyEventType, { emoji: string; label: string }>> = {
  USER_SIGNUP:          { emoji: "🎉", label: "Signed up" },
  RESUME_UPLOADED:      { emoji: "📄", label: "Uploaded resume" },
  JOB_ANALYSED:        { emoji: "🚀", label: "Analysed job" },
  RESUME_GENERATED:     { emoji: "🐨", label: "Generated resume" },
  COVER_LETTER_CREATED: { emoji: "✨", label: "Created cover letter" },
  APPLICATION_CREATED:  { emoji: "📝", label: "Started application" },
  SUBSCRIPTION_STARTED: { emoji: "💳", label: "Subscribed" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(iso);
}

// ── Sub-views ────────────────────────────────────────────────────────────────

function UserRow({ user }: { user: AdminUser }) {
  const label = user.plan ? (PLAN_LABELS[user.plan] ?? user.plan) : null;
  const initial = (user.name ?? user.email ?? "?")[0]?.toUpperCase() ?? "?";

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Avatar */}
      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0 mt-0.5">
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-0.5">
        {user.name
          ? <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
          : <p className="text-sm text-gray-400 italic">No name set</p>
        }
        {user.email
          ? <p className="text-xs text-gray-500 truncate">{user.email}</p>
          : <p className="text-xs text-gray-300 italic">No email</p>
        }
        <p className="text-[11px] text-gray-400">
          Joined {formatDate(user.joined)}
          <span className="text-gray-300 mx-1">·</span>
          {timeAgo(user.joined)}
        </p>
      </div>

      {/* Plan badge */}
      <div className="shrink-0 text-right">
        {label
          ? (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              {label}
            </span>
          )
          : (
            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-gray-200">
              Free
            </span>
          )
        }
      </div>
    </div>
  );
}

function EventRow({ event }: { event: KoalapplyEvent }) {
  const config = EVENT_LABELS[event.event_type] ?? { emoji: "•", label: event.event_type };
  const firstName = event.metadata?.first_name;
  const planType = event.metadata?.plan_type as string | undefined;
  const planLabel = planType ? (PLAN_LABELS[planType] ?? planType) : null;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xl w-8 text-center shrink-0 mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-gray-900 truncate">
          {firstName ?? "Anonymous"}
        </p>
        <p className="text-xs text-gray-500">{config.label}</p>
        {planLabel && (
          <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            {planLabel}
          </span>
        )}
      </div>
      <time className="text-[11px] text-gray-400 shrink-0 font-mono mt-0.5">
        {timeAgo(event.created_at)}
        <br />
        <span className="text-gray-300">{formatDate(event.created_at)}</span>
      </time>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface DetailPanelProps {
  config: PanelConfig;
  onClose: () => void;
}

export function DetailPanel({ config, onClose }: DetailPanelProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [events, setEvents] = useState<KoalapplyEvent[]>([]);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setUsers([]);
    setEvents([]);

    const url = config.kind === "users"
      ? `/api/admin/users?filter=${config.filter}`
      : `/api/admin/events?type=${config.type}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (config.kind === "users") setUsers(data as AdminUser[]);
        else setEvents(data as KoalapplyEvent[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [config]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOpen = Boolean(config);
  const count = config?.kind === "users" ? users.length : events.length;

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          "fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={[
          "fixed z-50 inset-0 flex items-center justify-center p-4 pointer-events-none",
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-auto w-full max-w-md bg-white rounded-2xl shadow-2xl",
            "border border-gray-200 flex flex-col max-h-[80vh]",
            "transition-all duration-200 ease-out",
            isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95",
          ].join(" ")}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{config?.title}</h2>
              {!loading && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {count} {count === 1 ? "result" : "results"}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-5">
            {loading ? (
              <div className="flex items-center justify-center h-32 text-sm text-gray-400">
                Loading…
              </div>
            ) : config?.kind === "users" ? (
              users.length === 0
                ? <p className="text-sm text-gray-400 text-center py-12">No users found.</p>
                : users.map((u) => <UserRow key={u.id} user={u} />)
            ) : (
              events.length === 0
                ? <p className="text-sm text-gray-400 text-center py-12">No events yet.</p>
                : events.map((e) => <EventRow key={e.id} event={e} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
