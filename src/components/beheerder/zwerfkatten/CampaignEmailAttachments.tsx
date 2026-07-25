"use client";

import { useState, useRef, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { CampaignAttachment } from "@/lib/queries/stray-cat-campaigns";

interface Props {
  campaignId: number;
  attachments: CampaignAttachment[];
}

/** Antwoord van /api/zwerfkatten/email/[id]/view (Story 10.41). */
interface EmailView {
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string | null;
  document: string;
  attachments: { index: number; filename: string; mimeType: string; size: number }[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleString("nl-BE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CampaignEmailAttachments({ campaignId, attachments }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();

  // Story 10.41: mail in de app lezen i.p.v. downloaden.
  const [openMail, setOpenMail] = useState<CampaignAttachment | null>(null);
  const [view, setView] = useState<EmailView | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [isLoadingView, setIsLoadingView] = useState(false);

  const closeViewer = useCallback(() => {
    setOpenMail(null);
    setView(null);
    setViewError(null);
  }, []);

  async function handleOpen(attachment: CampaignAttachment) {
    setOpenMail(attachment);
    setView(null);
    setViewError(null);
    setIsLoadingView(true);
    try {
      const res = await fetch(`/api/zwerfkatten/email/${attachment.id}/view`);
      const data = await res.json();
      if (!res.ok) {
        setViewError(data.error || "Kon de mail niet openen.");
      } else {
        setView(data as EmailView);
      }
    } catch {
      setViewError("Kon de mail niet openen. Probeer opnieuw.");
    } finally {
      setIsLoadingView(false);
    }
  }

  useEffect(() => {
    if (!openMail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeViewer();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openMail, closeViewer]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("campaignId", String(campaignId));

    try {
      const res = await fetch("/api/zwerfkatten/upload-email", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload mislukt");
      } else {
        router.refresh();
      }
    } catch {
      setError("Upload mislukt. Probeer opnieuw.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/zwerfkatten/email/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Verwijderen mislukt");
      } else {
        setConfirmDeleteId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          📧 Mails van gemeente
        </h3>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,message/rfc822"
            onChange={handleUpload}
            className="hidden"
            id="campaign-email-input"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isUploading ? "Bezig met uploaden..." : "Mail toevoegen (.eml)"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400">Nog geen mails geüpload.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {attachments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
              <button
                type="button"
                onClick={() => handleOpen(a)}
                className="flex flex-1 items-center gap-2 text-left text-sm font-medium text-emerald-700 hover:text-emerald-900 hover:underline"
                title="Klik om de mail hier te lezen"
              >
                <span>📧</span>
                <span className="break-all">{a.fileName}</span>
              </button>
              <span className="text-xs text-gray-400">{formatSize(a.fileSize)}</span>
              <a
                href={a.blobUrl}
                download={a.fileName}
                className="text-xs text-gray-500 underline hover:text-gray-700"
                title="Bewaar het .eml-bestand of open het in je mailprogramma"
              >
                Downloaden
              </a>
              <span className="text-xs text-gray-500">
                {formatDate(a.uploadedAt)}
                {a.uploadedBy && <span className="ml-1 text-gray-400">· {a.uploadedBy}</span>}
              </span>
              {confirmDeleteId === a.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">Verwijderen?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    disabled={isPending}
                    className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? "Bezig..." : "Ja"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(null)}
                    className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Annuleer
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(a.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Mail verwijderen"
                  aria-label="Mail verwijderen"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-gray-400">.eml-bestand uit Outlook · max 10MB</p>

      {openMail && (
        <EmailViewer
          attachmentId={openMail.id}
          fileName={openMail.fileName}
          blobUrl={openMail.blobUrl}
          view={view}
          error={viewError}
          isLoading={isLoadingView}
          onClose={closeViewer}
        />
      )}
    </div>
  );
}

/** Leesvenster voor een .eml (Story 10.41 — Sven: bekijken zonder te downloaden). */
function EmailViewer({
  attachmentId,
  fileName,
  blobUrl,
  view,
  error,
  isLoading,
  onClose,
}: {
  attachmentId: number;
  fileName: string;
  blobUrl: string;
  view: EmailView | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
}) {
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
                    <dd>{formatDate(view.date)}</dd>
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
              <a href={blobUrl} download={fileName} className="font-medium underline">
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
                          href={`/api/zwerfkatten/email/${attachmentId}/attachment/${att.index}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          <span>📎</span>
                          <span className="break-all">{att.filename}</span>
                          <span className="text-xs text-gray-400">{formatSize(att.size)}</span>
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
