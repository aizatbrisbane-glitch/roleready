import type { KoalapplyEvent, KoalapplyEventType } from "@/types/database";

const EVENT_CONFIG: Record<KoalapplyEventType, { emoji: string; label: string }> = {
  USER_SIGNUP:           { emoji: "🎉", label: "joined Koalapply" },
  RESUME_UPLOADED:       { emoji: "📄", label: "uploaded a resume" },
  JOB_ANALYSED:         { emoji: "🚀", label: "analysed a job" },
  RESUME_GENERATED:      { emoji: "🐨", label: "generated a resume" },
  COVER_LETTER_CREATED:  { emoji: "✨", label: "created a cover letter" },
  APPLICATION_CREATED:   { emoji: "📝", label: "started an application" },
  SUBSCRIPTION_STARTED:  { emoji: "💳", label: "became a subscriber" },
};

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 5)     return "just now";
  if (diff < 60)    return `${Math.floor(diff)}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface ActivityItemProps {
  event: KoalapplyEvent;
  isNew?: boolean;
}

export function ActivityItem({ event, isNew }: ActivityItemProps) {
  const config = EVENT_CONFIG[event.event_type] ?? { emoji: "•", label: event.event_type };
  const firstName = event.metadata?.first_name;

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-0",
        "hover:bg-gray-50 transition-colors",
        isNew ? "activity-item-new" : "",
      ].join(" ")}
    >
      <span className="text-lg w-7 text-center shrink-0 select-none">{config.emoji}</span>
      <p className="flex-1 min-w-0 text-sm text-gray-600 truncate">
        {firstName
          ? <><span className="font-medium text-gray-900">{firstName}</span>{" "}{config.label}</>
          : <span className="capitalize">{config.label}</span>
        }
      </p>
      <time className="text-[11px] text-gray-400 shrink-0 font-mono tabular-nums" dateTime={event.created_at}>
        {timeAgo(event.created_at)}
      </time>
    </div>
  );
}
