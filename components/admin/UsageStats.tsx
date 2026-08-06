import type { AdminMetrics, KoalapplyEventType } from "@/types/database";
import { MetricCard } from "./MetricCard";

interface UsageStatsProps {
  usage: AdminMetrics["usage"];
  onCardClick?: (eventType: KoalapplyEventType) => void;
}

export function UsageStats({ usage, onCardClick }: UsageStatsProps) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 px-1">
        Usage — all time
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard label="Resumes Uploaded"   value={usage.resumesUploaded}       onClick={onCardClick ? () => onCardClick("RESUME_UPLOADED")  : undefined} />
        <MetricCard label="Jobs Analysed"       value={usage.jobsAnalysed}          onClick={onCardClick ? () => onCardClick("JOB_ANALYSED")      : undefined} />
        <MetricCard label="AI Generations"      value={usage.resumesGenerated}      onClick={onCardClick ? () => onCardClick("RESUME_GENERATED")  : undefined} accent="purple" />
        <MetricCard label="Applications"        value={usage.applicationsCreated}   onClick={onCardClick ? () => onCardClick("APPLICATION_CREATED") : undefined} />
      </div>
    </div>
  );
}
