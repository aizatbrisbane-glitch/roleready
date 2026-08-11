"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";

type Props = {
  scoreWas: number;
  scoreNow: number;
  remainingKeywords: number;
  onClose: () => void;
};

export function KeywordUpsellModal({ scoreWas, scoreNow, remainingKeywords, onClose }: Props) {
  const [visible, setVisible] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    videoRef.current?.play().catch(() => {});
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  const gain = scoreNow - scoreWas;

  return (
    <div
      className={`fixed right-0 top-0 h-full w-80 md:w-96 z-40 flex flex-col bg-[#0d0b24] overflow-y-auto shadow-[-8px_0_32px_rgba(0,0,0,0.25)] transition-transform duration-300 ${visible ? "translate-x-0" : "translate-x-full"}`}
    >
      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Video */}
      <video
        ref={videoRef}
        src="/videos/koalapply-keyword-boost.mp4"
        className="w-full"
        controls
        playsInline
        muted
      />

      {/* Content */}
      <div className="px-6 py-5 space-y-3">
        <p className="text-lg font-bold text-white leading-snug">
          You just boosted your match score by{" "}
          <span className="text-[#ccff00]">+{gain}%</span>
          {remainingKeywords > 0 && (
            <> — and there {remainingKeywords === 1 ? "is" : "are"} still{" "}
            <span className="text-[#ccff00]">{remainingKeywords} keyword{remainingKeywords === 1 ? "" : "s"}</span> left to add.</>
          )}
        </p>
        <p className="text-sm text-white/60">
          Upgrade to keep going. Every keyword you add increases your chances of getting through ATS filters.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#ccff00] px-5 py-2.5 text-sm font-bold text-[#0d0b24] hover:bg-[#bbee00] transition"
          >
            <Sparkles className="h-4 w-4" />
            Unlock unlimited keywords
          </Link>
          <button
            type="button"
            onClick={handleClose}
            className="text-xs text-white/40 hover:text-white/70 transition"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
