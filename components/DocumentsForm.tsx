"use client";

import { useRef, useState } from "react";
import { Download, FileText, Mail } from "lucide-react";
import type { MasterCoverLetter, MasterResume } from "@/types/database";

function FileInputField({
  name,
  savedFileName,
  downloadUrl,
}: {
  name: string;
  savedFileName: string | null;
  downloadUrl: string | null;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const display = chosen ?? savedFileName;
  const isSaved = Boolean(savedFileName && !chosen);

  return (
    <div className="flex min-w-0 items-stretch gap-2">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`min-w-0 flex-1 rounded-2xl border px-4 py-3 text-left transition ${
          isSaved ? "border-teal-100 bg-teal-50/80 hover:bg-teal-100" : "border-stone-100 bg-[#fffaf4] hover:bg-stone-50"
        }`}
      >
        <p className={`truncate text-sm font-semibold ${display ? "text-[#14213d]" : "text-slate-400"}`}>
          {display ?? "Tap to select a file..."}
        </p>
        <p className={`mt-0.5 text-xs ${isSaved ? "text-[#0f8f83]" : "text-slate-400"}`}>
          {isSaved ? "Saved - tap to change" : chosen ? "Ready to upload" : "PDF, DOCX, TXT or MD"}
        </p>
      </button>

      {downloadUrl ? (
        <a
          href={downloadUrl}
          title="Download current file"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-stone-100 bg-white px-3 text-slate-500 transition hover:border-teal-200 hover:bg-teal-50 hover:text-[#0f8f83]"
        >
          <Download className="h-4 w-4" />
        </a>
      ) : null}

      <input
        ref={ref}
        type="file"
        name={name}
        accept=".pdf,.docx,.txt,.md"
        className="hidden"
        onChange={(event) => setChosen(event.target.files?.[0]?.name ?? null)}
      />
    </div>
  );
}

type Props = {
  masterResume: MasterResume | null;
  masterCoverLetter: MasterCoverLetter | null;
};

export function DocumentsForm({ masterResume, masterCoverLetter }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/profile/documents", { method: "POST", body: formData });
    const payload = await response.json();

    setMessage(response.ok ? "Documents saved." : payload.error ?? "Unable to save documents.");
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="max-w-full space-y-5 overflow-x-clip">
      <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-[1.8rem] bg-white/82 p-5 shadow-[0_18px_60px_rgba(20,33,61,0.06)] md:p-7">
        <div className="mb-5 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-[#0f9f92]">
            <FileText className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#14213d]">Master resume</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">This is the source ApplyHQ uses to tailor each application.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="label">Resume file</span>
            <FileInputField
              name="resume_file"
              savedFileName={masterResume?.file_name ?? null}
              downloadUrl={masterResume ? "/api/profile/download?type=resume" : null}
            />
          </div>
          <label className="block space-y-2">
            <span className="label">Resume text</span>
            <textarea name="resume_text" className="field min-h-72" defaultValue={masterResume?.resume_text ?? ""} />
          </label>
        </div>
      </section>

      <section className="rounded-[1.8rem] bg-white/82 p-5 shadow-[0_18px_60px_rgba(20,33,61,0.06)] md:p-7">
        <div className="mb-5 flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold text-[#14213d]">Master cover letter</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">Used as a tone and structure reference for tailored letters.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <span className="label">Cover letter file</span>
            <FileInputField
              name="cover_letter_file"
              savedFileName={masterCoverLetter?.file_name ?? null}
              downloadUrl={masterCoverLetter ? "/api/profile/download?type=cover" : null}
            />
          </div>
          <label className="block space-y-2">
            <span className="label">Cover letter text</span>
            <textarea name="cover_letter_text" className="field min-h-56" defaultValue={masterCoverLetter?.cover_letter_text ?? ""} />
          </label>
        </div>
      </section>
      </div>

      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <button className="btn-primary min-h-11 w-full sm:w-auto" disabled={loading} type="submit">
          {loading ? "Saving..." : "Save documents"}
        </button>
        {message ? <p className="min-w-0 text-sm text-slate-600">{message}</p> : null}
      </div>
    </form>
  );
}
