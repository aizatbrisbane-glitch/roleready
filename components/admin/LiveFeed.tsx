import type { KoalapplyEvent } from "@/types/database";
import { ActivityItem } from "./ActivityItem";

interface LiveFeedProps {
  events: KoalapplyEvent[];
  latestEventId?: string | null;
}

export function LiveFeed({ events, latestEventId }: LiveFeedProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col min-h-0">
      <div className="px-4 py-3 border-b border-gray-100 shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Live Activity
        </span>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-gray-300">
          Waiting for activity…
        </div>
      ) : (
        <div className="overflow-y-auto max-h-[340px]">
          {events.map((ev, i) => (
            <ActivityItem
              key={ev.id}
              event={ev}
              isNew={i === 0 && ev.id === latestEventId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
