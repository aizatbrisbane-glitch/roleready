"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DataPoint = {
  date: string;
  resumes: number;
  jobs: number;
  aiResumes: number;
  coverLetters: number;
  applications: number;
};

function formatDay(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

const SERIES = [
  { key: "jobs",         label: "Jobs Analysed",    color: "#3b82f6" },
  { key: "resumes",      label: "Resumes Uploaded",  color: "#10b981" },
  { key: "aiResumes",    label: "AI Resumes",        color: "#8b5cf6" },
  { key: "coverLetters", label: "Cover Letters",     color: "#a78bfa" },
  { key: "applications", label: "Applications",      color: "#f59e0b" },
] as const;

interface UsageChartProps {
  data: DataPoint[];
}

export function UsageChart({ data }: UsageChartProps) {
  const total = data.reduce(
    (s, d) => s + d.resumes + d.jobs + d.aiResumes + d.coverLetters + d.applications,
    0
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Daily Activity
          </p>
          <p className="text-2xl font-bold font-mono text-gray-900 mt-0.5">{total}</p>
          <p className="text-xs text-gray-400">actions in last 30 days</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={6}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            interval={6}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              fontSize: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            }}
            labelFormatter={formatDay}
          />
          <Legend
            wrapperStyle={{ fontSize: 10, paddingTop: 8 }}
            iconType="circle"
            iconSize={7}
          />
          {SERIES.map((s) => (
            <Bar key={s.key} dataKey={s.key} name={s.label} stackId="a" fill={s.color} radius={s.key === "applications" ? [3, 3, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
