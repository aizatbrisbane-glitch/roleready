"use client";

import { useRef, useState } from "react";
import { ShieldCheck, UploadCloud, Zap } from "lucide-react";
import { HomepageOnboardingModal } from "@/components/landing/HomepageOnboardingModal";

export function BlogResumeCTA() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function handleFile(file?: File | null) {
    if (!file) return;
    setPendingFile(file);
    setModalOpen(true);
  }

  return (
    <>
      <section className="px-5 py-10 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-[#b9adff] bg-white p-6 text-center shadow-[0_28px_90px_rgba(34,0,255,0.16)] transition hover:-translate-y-0.5 hover:border-[#2200ff] sm:rounded-[2.25rem] sm:p-12"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-[1.2rem] bg-[#ece8ff] text-[#2200ff] shadow-sm sm:h-24 sm:w-24 sm:rounded-[1.7rem]">
              <UploadCloud className="h-9 w-9 sm:h-14 sm:w-14" />
            </span>
            <p className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:mt-6 sm:text-4xl">Drop your resume here. See what it could look like.</p>
            <p className="mt-3 text-base font-semibold text-slate-500">PDF or DOCX · Max 4 MB</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#2200ff] px-6 py-3 text-base font-bold text-white shadow-[0_16px_44px_rgba(34,0,255,0.34)] transition hover:bg-[#1a00cc] sm:mt-8 sm:px-7 sm:py-4 sm:text-lg"
            >
              Tailor My Resume for FREE
            </button>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 sm:mt-3">
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                No credit card required
              </p>
              <p className="inline-flex items-center gap-1.5 text-xs text-slate-400 sm:text-sm">
                <Zap className="h-4 w-4" />
                ATS-friendly PDFs
              </p>
            </div>
          </div>
        </div>
      </section>

      <HomepageOnboardingModal
        open={modalOpen}
        initialResumeFile={pendingFile}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
