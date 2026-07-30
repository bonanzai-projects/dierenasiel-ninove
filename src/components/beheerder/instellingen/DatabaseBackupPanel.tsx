"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBackup,
  restoreBackup,
  deleteBackup,
} from "@/lib/actions/database-backup";
import { formatBackupMoment, formatBytes } from "@/lib/backup/format";
import type { BackupListItem } from "@/lib/queries/database-backups";

interface DatabaseBackupPanelProps {
  backups: BackupListItem[];
}

export default function DatabaseBackupPanel({ backups }: DatabaseBackupPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lijstZichtbaar, setLijstZichtbaar] = useState(false);
  const [naam, setNaam] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function voerUit(actie: () => Promise<{ success: boolean; message?: string; error?: string }>) {
    setMessage(null);
    setIsError(false);
    startTransition(async () => {
      const result = await actie();
      setIsError(!result.success);
      setMessage(result.success ? (result.message ?? "Klaar.") : (result.error ?? "Er ging iets mis."));
      if (result.success) router.refresh();
    });
  }

  function handleBewaren() {
    voerUit(async () => {
      const result = await createBackup(naam);
      if (result.success) setNaam("");
      return result;
    });
  }

  function handleTerugzetten(bewaring: BackupListItem) {
    if (
      !window.confirm(
        `OPGELET: dit vervangt ALLE huidige gegevens door de toestand van ` +
          `${formatBackupMoment(bewaring.createdAt)} ("${bewaring.label}").\n\n` +
          `De huidige toestand wordt eerst automatisch bewaard, zodat je terug kan. ` +
          `Doorgaan?`,
      )
    )
      return;

    voerUit(() => restoreBackup(bewaring.id));
  }

  function handleVerwijderen(bewaring: BackupListItem) {
    if (!window.confirm(`De bewaring "${bewaring.label}" definitief verwijderen?`)) return;
    voerUit(() => deleteBackup(bewaring.id));
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-semibold text-[#1b4332]">
        Databank bewaren en terugzetten
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        Bewaar de volledige inhoud van de databank op een moment dat jij kiest — bijvoorbeeld
        vlak vóór een grote wijziging. Loopt er nadien iets mis, dan zet je die toestand in één
        klik terug. Het logboek (audit) wordt niet mee bewaard of teruggezet: dat blijft
        gewoon doorlopen.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[16rem] flex-1">
          <label htmlFor="backup-naam" className="mb-1 block text-sm font-medium text-gray-700">
            Naam <span className="font-normal text-gray-400">(optioneel)</span>
          </label>
          <input
            id="backup-naam"
            type="text"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="bv. Voor de AnimalShelter-import"
            maxLength={200}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleBewaren}
          disabled={isPending}
          className="rounded-md bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#14352a] disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Nu bewaren"}
        </button>

        <button
          type="button"
          onClick={() => setLijstZichtbaar((zichtbaar) => !zichtbaar)}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {lijstZichtbaar
            ? `Bewaarde momenten verbergen (${backups.length})`
            : `Bewaarde momenten tonen (${backups.length})`}
        </button>
      </div>

      {message && (
        <p className={`mt-3 text-sm ${isError ? "text-red-600" : "text-green-600"}`}>
          {message}
        </p>
      )}

      {lijstZichtbaar && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          {backups.length === 0 ? (
            <p className="text-sm text-gray-500">
              Er is nog niets bewaard. Klik op <strong>Nu bewaren</strong> om te beginnen.
            </p>
          ) : (
            <ul className="space-y-2">
              {backups.map((bewaring) => (
                <li
                  key={bewaring.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">
                      {bewaring.label}
                      {bewaring.isAutomatic && (
                        <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600">
                          automatisch
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatBackupMoment(bewaring.createdAt)}
                      {bewaring.createdByName ? ` · ${bewaring.createdByName}` : ""} ·{" "}
                      {bewaring.rowCount} rijen · {formatBytes(bewaring.sizeBytes)}
                    </p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTerugzetten(bewaring)}
                      disabled={isPending}
                      className="rounded-md bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      Terugzetten
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerwijderen(bewaring)}
                      disabled={isPending}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Verwijderen
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
