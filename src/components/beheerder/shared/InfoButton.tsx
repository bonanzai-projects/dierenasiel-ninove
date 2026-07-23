"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Kleine 'i'-knop die een uitleg-venster opent. Gebruikt <dialog> zodat
 * Escape, focusval en de achtergrond-overlay uit de browser komen i.p.v.
 * uit eigen code.
 *
 * LET OP: dit component rendert een <dialog> naast de knop. Plaats het dus
 * niet binnen een <p> — een paragraaf mag enkel tekst-inhoud bevatten en de
 * browser breekt de opbouw dan open, wat een hydration-fout geeft. Zet het in
 * een <div> of een <span>-vrije container.
 */
export default function InfoButton({
  title,
  label,
  children,
}: {
  /** Titel bovenaan het venster. */
  title: string;
  /** Toegankelijke naam van de knop, bv. "Uitleg over de workflow". */
  label: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Sluiten door naast het venster te klikken.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onClick = (event: MouseEvent) => {
      if (event.target === dialog) dialog.close();
    };
    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-gray-300 text-[11px] font-bold text-gray-500 transition-colors hover:border-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white focus:outline-none focus:ring-2 focus:ring-[#2d6a4f] focus:ring-offset-1"
      >
        i
      </button>

      <dialog
        ref={dialogRef}
        aria-label={title}
        // m-auto centreert het venster: de browser doet dat standaard voor een
        // modale <dialog>, maar Tailwind's preflight zet alle marges op 0.
        className="m-auto w-[min(42rem,92vw)] rounded-lg p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-3">
          <h4 className="text-base font-semibold text-[#1b4332]">{title}</h4>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Sluiten"
            className="-mr-1 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700">
          {children}
        </div>

        <div className="flex justify-end border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md bg-[#1b4332] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#2d6a4f]"
          >
            Begrepen
          </button>
        </div>
      </dialog>
    </>
  );
}
