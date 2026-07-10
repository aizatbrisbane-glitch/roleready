"use client";

import { useEffect, useState } from "react";
import { SignupChart } from "./SignupChart";
import { UsageChart } from "./UsageChart";

type ChartData = {
  signups: { date: string; signups: number }[];
  usage: {
    date: string;
    resumes: number;
    jobs: number;
    aiResumes: number;
    coverLetters: number;
    applications: number;
  }[];
};

export function ChartsRow() {
  const [data, setData] = useState<ChartData | null>(null);

  useEffect(() => {
    fetch("/api/admin/charts", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 h-[272px] flex items-center justify-center">
            <span className="text-sm text-gray-300">Loading…</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <SignupChart data={data.signups} />
      <UsageChart data={data.usage} />
    </div>
  );
}
