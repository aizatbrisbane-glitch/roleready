"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { date: string; signups: number };

function formatDay(date: string) {
  return new Date(date + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

interface SignupChartProps {
  data: DataPoint[];
}

export function SignupChart({ data }: SignupChartProps) {
  const total = data.reduce((s, d) => s + d.signups, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            New Signups
          </p>
          <p className="text-2xl font-bold font-mono text-gray-900 mt-0.5">{total}</p>
          <p className="text-xs text-gray-400">last 30 days</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <defs>
            <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            formatter={(v: number) => [v, "signups"]}
          />
          <Area
            type="monotone"
            dataKey="signups"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#signupGrad)"
            dot={false}
            activeDot={{ r: 4, fill: "#10b981" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
