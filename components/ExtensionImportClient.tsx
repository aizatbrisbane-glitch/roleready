"use client";

import { useEffect, useState } from "react";

type ImportedJob = {
  title?: string;
  company?: string;
  location?: string;
  salary?: string;
  description?: string;
  url?: string;
};

function parsePayload(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return JSON.parse(decodeURIComponent(escape(window.atob(padded)))) as ImportedJob;
}

export function ExtensionImportClient() {
  const [status, setStatus] = useState("Waiting for the extension to send the job ad...");

  useEffect(() => {
    async function importJob(payload: ImportedJob) {
      if (!payload || typeof payload.description !== "string") {
        setStatus("The extension did not send a readable job ad. Go back to the job page, scroll until the full ad is visible, then try again.");
        return;
      }

      setStatus("Creating application from the visible job ad...");

      const response = await fetch("/api/extension/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });
      const responseText = await response.text();
      const result = responseText ? JSON.parse(responseText) : null;

      if (!response.ok) {
        setStatus(result?.error ?? `Unable to import this job ad. The app returned HTTP ${response.status}.`);
        return;
      }

      if (!result?.applicationUrl) {
        setStatus("The app created no application link. Restart the dev server and try again.");
        return;
      }

      setStatus("Application created. Opening it now...");
      window.location.href = result.applicationUrl;
    }

    function readPayload() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const payloadFromHash = hashParams.get("payload");

      if (payloadFromHash) {
        window.history.replaceState(null, "", window.location.pathname);
        try {
          importJob(parsePayload(payloadFromHash)).catch((error) => {
            setStatus(error instanceof Error ? error.message : "Unable to import this job ad.");
          });
        } catch {
          setStatus("The extension sent unreadable job data. Reload the extension and try again.");
        }
        return;
      }

      const raw = window.localStorage.getItem("job-assistant-extension-payload");
      if (!raw) {
        return;
      }

      window.localStorage.removeItem("job-assistant-extension-payload");
      try {
        importJob(JSON.parse(raw)).catch((error) => {
          setStatus(error instanceof Error ? error.message : "Unable to import this job ad.");
        });
      } catch {
        setStatus("The extension sent unreadable job data. Reload the extension and try again.");
      }
    }

    window.addEventListener("job-assistant-extension-payload", readPayload);
    readPayload();

    return () => window.removeEventListener("job-assistant-extension-payload", readPayload);
  }, []);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-xl overflow-x-clip px-4 py-12">
      <section className="w-full max-w-full rounded-md border border-stone-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-stone-950">Importing Job Ad</h1>
        <p className="mt-3 text-sm leading-6 text-stone-700">{status}</p>
      </section>
    </main>
  );
}
