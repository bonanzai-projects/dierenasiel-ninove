"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { pdfDownloadUrl } from "@/lib/pdf/disposition";

interface DialogProps {
  src: string;
  title: string;
  onClose: () => void;
}

/**
 * Story 10.71 — een PDF bekijken in het programma i.p.v. hem te downloaden (Sven, R11:
 * "gezien beveiligen van gegevens"). De route stuurt de PDF `inline`; "Downloaden" vraagt
 * dezelfde PDF op met `?download=1`. Een browser kan opslaan nooit helemaal verhinderen,
 * maar standaard belandt er geen kopie meer in de map Downloads.
 */
function PdfViewerDialog({ src, title, onClose }: DialogProps) {
  // Escape sluit, zoals de andere vensters in de backoffice.
  useEffect(() => {
    function opToets(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", opToets);
    return () => document.removeEventListener("keydown", opToets);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex bg-black/70 p-2 sm:p-6"
      onClick={onClose}
    >
      <div
        className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-2">
          <h2 className="truncate text-sm font-semibold text-gray-900">{title}</h2>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={pdfDownloadUrl(src)}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Downloaden
            </a>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-[#1b4332] px-3 py-1 text-sm font-medium text-white hover:bg-[#2d6a4f]"
            >
              Sluiten
            </button>
          </div>
        </div>
        <iframe title={title} src={src} className="w-full flex-1 border-0" />
      </div>
    </div>,
    document.body,
  );
}

interface ButtonProps {
  /** Adres van de PDF-route; die moet `inline` antwoorden en `?download=1` kennen. */
  src: string;
  title: string;
  className?: string;
  children: ReactNode;
}

/** Een knop die de PDF in een venster in het programma opent. */
export default function PdfViewerButton({ src, title, className, children }: ButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <PdfViewerDialog src={src} title={title} onClose={() => setOpen(false)} />}
    </>
  );
}
