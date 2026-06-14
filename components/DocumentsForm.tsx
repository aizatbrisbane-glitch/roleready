"use client";

import { useRef, useState } from "react";
import { Download, Eye, FileText, Mail, Pencil } from "lucide-react";
import { CoverLetterRenderer, ResumeRenderer } from "@/components/ResumeRenderer";
import type { MasterCoverLetter, MasterResume } from "@/types/database";

function hasMarkdown(text: string) {
  return /^#{1,3} /m.test(text) || /^- /m.test(text);
}

function PlainTextPreview({ content }: { content: string }) {
  return (
    <div className="bg-slate-50 px-4 py-6 md:px-8 md:py-8">
      <div className="mx-auto w-full max-w-[794px] bg-white px-10 py-10 shadow-[0_2px_16px_rgba(0,0,0,0.10)] md:px-16 md:py-14">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-slate-700">{content}</pre>
      </div>
    </div>
  );
}

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
          isSaved ? "border-[#d4ccff] bg-[#ece8ff]/80 hover:bg-[#d4ccff]" : "border-slate-100 bg-slate-50 hover:bg-slate-100"
        }`}
      >
        <p className={`truncate text-sm font-semibold ${display ? "text-slate-900" : "text-slate-400"}`}>
          {display ?? "Tap to select a file..."}
        </p>
        <p className={`mt-0.5 text-xs ${isSaved ? "text-[#2200ff]" : "text-slate-400"}`}>
          {isSaved ? "Saved - tap to change" : chosen ? "Ready to upload" : "PDF, DOCX, TXT or MD"}
        </p>
      </button>

      {downloadUrl ? (
        <a
          href={downloadUrl}
          title="Download current file"
          className="flex min-h-12 items-center justify-center rounded-2xl border border-slate-100 bg-white px-3 text-slate-500 transition hover:border-[#d4ccff] hover:bg-[#ece8ff] hover:text-[#2200ff]"
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

function ModeToggle({ mode, onChange }: { mode: "edit" | "preview"; onChange: (m: "edit" | "preview") => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => onChange("edit")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
          mode === "edit" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
      <button
        type="button"
        onClick={() => onChange("preview")}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
          mode === "preview" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
        }`}
      >
        <Eye className="h-3 w-3" /> Preview
      </button>
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
  const [resumeText, setResumeText] = useState(masterResume?.resume_text ?? "");
  const [coverText, setCoverText] = useState(masterCoverLetter?.cover_letter_text ?? "");
  const [resumeMode, setResumeMode] = useState<"edit" | "preview">("edit");
  const [coverMode, setCoverMode] = useState<"edit" | "preview">("edit");

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

        {/* Resume card */}
        <section className="rounded-[1.8rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 p-5 md:p-7 pb-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ece8ff] text-[#2200ff]">
                <FileText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Master resume</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">This is the source Koalapply uses to tailor each application.</p>
              </div>
            </div>
            <ModeToggle mode={resumeMode} onChange={setResumeMode} />
          </div>

          {resumeMode === "edit" ? (
            <div className="space-y-4 px-5 pb-5 md:px-7 md:pb-7">
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
                <textarea
                  name="resume_text"
                  className="field min-h-72"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              {/* Hidden input keeps the value in the form when in preview mode */}
              <input type="hidden" name="resume_text" value={resumeText} />
              <div className="max-h-[520px] overflow-auto rounded-b-[1.8rem]">
                {resumeText.trim()
                  ? hasMarkdown(resumeText)
                    ? <ResumeRenderer content={resumeText} />
                    : <PlainTextPreview content={resumeText} />
                  : <p className="px-7 py-10 text-sm italic text-slate-400">No resume text yet â€” switch to Edit to add content.</p>
                }
              </div>
            </>
          )}
        </section>

        {/* Cover letter card */}
        <section className="rounded-[1.8rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 p-5 md:p-7 pb-4">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">Master cover letter</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">Used as a tone and structure reference for tailored letters.</p>
              </div>
            </div>
            <ModeToggle mode={coverMode} onChange={setCoverMode} />
          </div>

          {coverMode === "edit" ? (
            <div className="space-y-4 px-5 pb-5 md:px-7 md:pb-7">
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
                <textarea
                  name="cover_letter_text"
                  className="field min-h-56"
                  value={coverText}
                  onChange={(e) => setCoverText(e.target.value)}
                />
              </label>
            </div>
          ) : (
            <>
              <input type="hidden" name="cover_letter_text" value={coverText} />
              <div className="max-h-[520px] overflow-auto rounded-b-[1.8rem]">
                {coverText.trim()
                  ? hasMarkdown(coverText)
                    ? <CoverLetterRenderer content={coverText} />
                    : <PlainTextPreview content={coverText} />
                  : <p className="px-7 py-10 text-sm italic text-slate-400">No cover letter text yet â€” switch to Edit to add content.</p>
                }
              </div>
            </>
          )}
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
