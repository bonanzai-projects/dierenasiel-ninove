"use client";

import type { EmlView } from "@/lib/email/eml-read";

/**
 * Leesvenster voor een .eml (story 10.41 — Sven: bekijken zonder te downloaden).
 * Sinds story 10.74 gedeeld door zwerfkatten en de berichten na adoptie; elk
 * geeft zijn eigen adressen mee (download en bijlagen komen uit een andere route).
 */

export type EmailView = EmlView;

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDateTime(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface Props {
  fileName: string;
  /** Waar de mail zelf gedownload kan worden als ze niet te lezen is. */
  downloadUrl: string;
  /** Adres van een bijlage in de mail, op volgnummer. */
  attachmentHref: (index: number) => string;
  view: EmailView | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function EmailViewer({
  fileName,
  downloadUrl,
  attachmentHref,
  view,
  error,
  isLoading,
  onClose,
}: Props) {
  return (
    // Bewust een eigen overlay i.p.v. <dialog>: dat laatste wordt niet ondersteund
    // in de testomgeving (jsdom).
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:p-8">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Mail: ${fileName}`}
        className="relative z-10 w-full max-w-3xl rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0">
            <h4 className="truncate text-base font-semibold text-[#1b4332]">
              {view?.subject ?? fileName}
            </h4>
            {view && (
              <dl className="mt-1 space-y-0.5 text-xs text-gray-600">
                {view.from && (
                  <div className="flex gap-1">
                    <dt className="font-medium text-gray-500">Van:</dt>
                    <dd className="break-all">{view.from}</dd>
                  </div>
                )}
                {view.to && (
                  <div className="flex gap-1">
                    <dt className="font-medium text-gray-500">Aan:</dt>
                    <dd className="break-all">{view.to}</dd>
                  </div>
                )}
                {view.cc && (
                  <div className="flex gap-1">
                    <dt className="font-medium text-gray-500">Cc:</dt>
                    <dd className="break-all">{view.cc}</dd>
                  </div>
                )}
                {view.date && (
                  <div className="flex gap-1">
                    <dt className="font-medium text-gray-500">Datum:</dt>
                    <dd>{formatDateTime(view.date)}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {isLoading && <p className="py-8 text-center text-sm text-gray-500">Mail wordt geladen…</p>}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}{" "}
              <a href={downloadUrl} download={fileName} className="font-medium underline">
                Download het bestand
              </a>
              .
            </div>
          )}

          {view && (
            <>
              {/* sandbox zonder allow-scripts: de mail-inhoud kan geen code uitvoeren.
                  allow-popups zodat links uit de mail wel in een nieuw tabblad openen. */}
              <iframe
                title="Inhoud van de mail"
                srcDoc={view.document}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                className="h-[60vh] w-full rounded-lg border border-gray-200 bg-white"
              />

              {view.attachments.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bijlagen in deze mail
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-2">
                    {view.attachments.map((att) => (
                      <li key={att.index}>
                        <a
                          href={attachmentHref(att.index)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <span>📎</span>
                          <span className="break-all">{att.filename}</span>
                          <span className="text-xs text-gray-400">{formatFileSize(att.size)}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
