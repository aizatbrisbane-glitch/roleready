"use client";

import { useEffect, useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { KoalapplyEvent, KoalapplyEventType } from "@/types/database";

// ── Types ────────────────────────────────────────────────────────────────────

type AdminUser = {
  id: string;
  name: string | null;
  email: string;
  plan: string | null;
  applicationsUsed: number | null;
  applicationLimit: number | null;
  validUntil: string | null;
  monthlyGenerationsUsed: number;
  monthlyResetAt: string | null;
  attrSource: string | null;
  attrMedium: string | null;
  attrCampaign: string | null;
  attrLandingPage: string | null;
  joined: string;
};

export type PanelConfig =
  | { kind: "users"; filter: "all" | "today" | "week" | "paid"; title: string }
  | { kind: "users"; filter: "source"; source: string; title: string }
  | { kind: "events"; type: KoalapplyEventType; title: string }
  | { kind: "subscribers"; title: string }
  | null;

type Subscriber = { email: string; name: string | null; subscribedAt: string };

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

  const remaining = user.applicationLimit !== null && user.applicationsUsed !== null
    ? user.applicationLimit - user.applicationsUsed
    : null;

  const expiresIn = user.validUntil
    ? Math.ceil((new Date(user.validUntil).getTime() - Date.now()) / 86400000)
    : null;

  const expiryLabel = expiresIn !== null
    ? expiresIn <= 0
      ? "Expired"
      : expiresIn === 1
        ? "Expires tomorrow"
        : `Expires in ${expiresIn}d`
    : null;

  const expiryUrgent = expiresIn !== null && expiresIn <= 3;

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
        {user.attrSource && (
          <p className="text-[11px] text-gray-400">
            <span className="capitalize font-medium text-gray-500">{user.attrSource}</span>
            {user.attrMedium && user.attrMedium !== "(none)" && (
              <span className="text-gray-300"> · {user.attrMedium}</span>
            )}
            {user.attrCampaign && user.attrCampaign !== "(none)" && (
              <span className="text-gray-300"> · {user.attrCampaign}</span>
            )}
          </p>
        )}
        {user.attrLandingPage && (
          <p className="text-[11px] text-gray-400 truncate">
            <span className="text-gray-300">landed </span>
            <span className="font-medium text-gray-500">{user.attrLandingPage}</span>
          </p>
        )}
        {label ? (
          <div className="flex items-center gap-2 pt-0.5 flex-wrap">
            {remaining !== null && (
              <span className="text-[11px] text-gray-500">
                <span className="font-semibold text-gray-700">{remaining}</span>/{user.applicationLimit} apps left
              </span>
            )}
            {expiryLabel && (
              <span className={`text-[11px] font-medium ${expiryUrgent ? "text-rose-500" : "text-gray-400"}`}>
                · {expiryLabel}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1 pt-0.5">
            <span className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-700">{user.monthlyGenerationsUsed}</span>/1 free use this month
            </span>
            {user.monthlyResetAt && (
              <span className="text-[11px] text-gray-400">
                · resets {formatDate(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString())}
              </span>
            )}
          </div>
        )}
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
  const displayName = firstName ?? event.email;

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className="text-xl w-8 text-center shrink-0 mt-0.5">{config.emoji}</span>
      <div className="flex-1 min-w-0 space-y-0.5">
        {displayName && (
          <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
        )}
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

function CopyEmailsButton({ emails }: { emails: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(emails.join(", ")).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        });
      }}
      className="flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-indigo-700"
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied!" : "Copy all emails"}
    </button>
  );
}

function SubscriberRow({ subscriber }: { subscriber: Subscriber }) {
  const initial = (subscriber.name ?? subscriber.email)[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center text-sm font-semibold text-indigo-400 shrink-0">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        {subscriber.name && (
          <p className="text-sm font-medium text-gray-900 truncate">{subscriber.name}</p>
        )}
        <p className="text-xs text-gray-500 truncate">{subscriber.email}</p>
      </div>
      <time className="text-[11px] text-gray-400 shrink-0 font-mono">
        {timeAgo(subscriber.subscribedAt)}
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
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  useEffect(() => {
    if (!config) return;
    setLoading(true);
    setUsers([]);
    setEvents([]);
    setSubscribers([]);

    const url = config.kind === "users"
      ? config.filter === "source"
        ? `/api/admin/users?filter=source&source=${encodeURIComponent(config.source)}`
        : `/api/admin/users?filter=${config.filter}`
      : config.kind === "subscribers"
        ? "/api/admin/subscribers"
        : `/api/admin/events?type=${config.type}`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (config.kind === "users") setUsers(data as AdminUser[]);
        else if (config.kind === "subscribers") setSubscribers(data as Subscriber[]);
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
  const count = config?.kind === "users" ? users.length : config?.kind === "subscribers" ? subscribers.length : events.length;

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
            <div className="flex items-center gap-2">
              {!loading && config?.kind === "subscribers" && subscribers.length > 0 && (
                <CopyEmailsButton emails={subscribers.map((s) => s.email)} />
              )}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
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
            ) : config?.kind === "subscribers" ? (
              subscribers.length === 0
                ? <p className="text-sm text-gray-400 text-center py-12">No subscribers yet.</p>
                : subscribers.map((s) => <SubscriberRow key={s.email} subscriber={s} />)
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
