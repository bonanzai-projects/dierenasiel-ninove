"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createMedicalInspectionAction,
  updateMedicalInspectionAction,
  deleteMedicalInspectionAction,
} from "@/lib/actions/stray-cat-campaigns";
import {
  FIV_FELV_STATUSES,
  FIV_FELV_STATUS_LABELS,
  CAMPAIGN_OUTCOMES,
  CAMPAIGN_OUTCOME_LABELS,
} from "@/lib/constants";
import type { MedicalInspectionWithRecorder } from "@/lib/queries/stray-cat-campaigns";

interface Props {
  campaignId: number;
  inspections: MedicalInspectionWithRecorder[];
}

interface DraftInspection {
  inspectionDate: string;
  vetName: string;
  catDescription: string;
  cageAtVet: string;
  fivStatus: string;
  felvStatus: string;
  outcome: string;
  notes: string;
}

const EMPTY_DRAFT: DraftInspection = {
  inspectionDate: "",
  vetName: "",
  catDescription: "",
  cageAtVet: "",
  fivStatus: "",
  felvStatus: "",
  outcome: "",
  notes: "",
};

function fromInspection(i: MedicalInspectionWithRecorder): DraftInspection {
  return {
    inspectionDate: i.inspectionDate ?? "",
    vetName: i.vetName ?? "",
    catDescription: i.catDescription ?? "",
    cageAtVet: i.cageAtVet ?? "",
    fivStatus: i.fivStatus ?? "",
    felvStatus: i.felvStatus ?? "",
    outcome: i.outcome ?? "",
    notes: i.notes ?? "",
  };
}

function toPayload(draft: DraftInspection) {
  return {
    inspectionDate: draft.inspectionDate,
    vetName: draft.vetName,
    catDescription: draft.catDescription,
    cageAtVet: draft.cageAtVet,
    fivStatus: draft.fivStatus || null,
    felvStatus: draft.felvStatus || null,
    outcome: draft.outcome || null,
    notes: draft.notes,
  };
}

export default function MedicalInspectionsSection({ campaignId, inspections }: Props) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState<DraftInspection>({
    ...EMPTY_DRAFT,
    inspectionDate: new Date().toISOString().split("T")[0],
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setAddError(null);
    startTransition(async () => {
      const result = await createMedicalInspectionAction({
        campaignId,
        ...toPayload(addDraft),
      });
      if (!result.success) {
        setAddError(result.error || "Aanmaken mislukt");
      } else {
        setShowAddForm(false);
        setAddDraft({
          ...EMPTY_DRAFT,
          inspectionDate: new Date().toISOString().split("T")[0],
        });
        router.refresh();
      }
    });
  }

  function handleDelete(id: number) {
    setGlobalError(null);
    startTransition(async () => {
      const result = await deleteMedicalInspectionAction(id);
      if (!result.success) {
        setGlobalError(result.error || "Verwijderen mislukt");
      } else {
        setConfirmDeleteId(null);
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Medische inspecties
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {inspections.length}
          </span>
        </h3>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => {
              setShowAddForm(true);
              setAddError(null);
            }}
            className="rounded-lg border border-purple-600 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-50"
          >
            + Medische inspectie toevoegen
          </button>
        )}
      </div>
      <p className="mb-4 text-xs italic text-gray-500">
        Eén rij per kat die naar de dierenarts gebracht is binnen deze campagne (datum, dierenarts, FIV/FeLV-test, uitkomst).
      </p>

      {globalError && (
        <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{globalError}</div>
      )}

      {showAddForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-purple-50/30 p-4">
          <h4 className="mb-3 text-xs font-semibold uppercase text-purple-800">Nieuwe medische inspectie</h4>
          {addError && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">{addError}</div>}
          <InspectionFormFields draft={addDraft} onChange={setAddDraft} />
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !addDraft.inspectionDate}
              className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {isPending ? "Bezig..." : "Inspectie opslaan"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setAddError(null);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {inspections.length === 0 && !showAddForm ? (
        <p className="py-4 text-center text-sm text-gray-400">
          Nog geen medische inspecties geregistreerd.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {inspections.map((inspection) => (
            <InspectionRow
              key={inspection.id}
              inspection={inspection}
              isEditing={editingId === inspection.id}
              isConfirmDelete={confirmDeleteId === inspection.id}
              isPending={isPending}
              onStartEdit={() => {
                setEditingId(inspection.id);
                setConfirmDeleteId(null);
                setGlobalError(null);
              }}
              onCancelEdit={() => setEditingId(null)}
              onAfterEdit={() => {
                setEditingId(null);
                setGlobalError(null);
                router.refresh();
              }}
              onSetGlobalError={setGlobalError}
              onConfirmDelete={() => {
                setConfirmDeleteId(inspection.id);
                setEditingId(null);
                setGlobalError(null);
              }}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDeleteAction={() => handleDelete(inspection.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function InspectionRow({
  inspection,
  isEditing,
  isConfirmDelete,
  isPending,
  onStartEdit,
  onCancelEdit,
  onAfterEdit,
  onSetGlobalError,
  onConfirmDelete,
  onCancelDelete,
  onConfirmDeleteAction,
}: {
  inspection: MedicalInspectionWithRecorder;
  isEditing: boolean;
  isConfirmDelete: boolean;
  isPending: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onAfterEdit: () => void;
  onSetGlobalError: (err: string | null) => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDeleteAction: () => void;
}) {
  const [draft, setDraft] = useState<DraftInspection>(fromInspection(inspection));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSave] = useTransition();

  function handleSave() {
    setError(null);
    onSetGlobalError(null);
    startSave(async () => {
      const result = await updateMedicalInspectionAction({
        id: inspection.id,
        ...toPayload(draft),
      });
      if (!result.success) {
        setError(result.error || "Bijwerken mislukt");
      } else {
        onAfterEdit();
      }
    });
  }

  if (isEditing) {
    return (
      <li className="bg-purple-50/30 px-4 py-4">
        {error && <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-800">{error}</div>}
        <InspectionFormFields draft={draft} onChange={setDraft} />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !draft.inspectionDate}
            className="rounded-md bg-purple-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isSaving ? "Bezig..." : "Opslaan"}
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>
      </li>
    );
  }

  const fivLabel = inspection.fivStatus
    ? FIV_FELV_STATUS_LABELS[inspection.fivStatus as keyof typeof FIV_FELV_STATUS_LABELS] ?? inspection.fivStatus
    : null;
  const felvLabel = inspection.felvStatus
    ? FIV_FELV_STATUS_LABELS[inspection.felvStatus as keyof typeof FIV_FELV_STATUS_LABELS] ?? inspection.felvStatus
    : null;
  const outcomeLabel = inspection.outcome
    ? CAMPAIGN_OUTCOME_LABELS[inspection.outcome as keyof typeof CAMPAIGN_OUTCOME_LABELS] ?? inspection.outcome
    : null;

  return (
    <li className="px-1 py-3 text-sm hover:bg-gray-50">
      <div className="grid grid-cols-[7rem_minmax(8rem,12rem)_minmax(5rem,8rem)_minmax(0,1fr)_auto] items-center gap-x-4">
        {/* Datum */}
        <span className="font-medium text-gray-800 tabular-nums">
          {inspection.inspectionDate}
        </span>

        {/* Dierenarts */}
        <span className="truncate text-gray-700">
          {inspection.vetName ? (
            <>
              <span className="mr-1 text-xs uppercase text-gray-400">Dierenarts:</span>
              <span className="font-medium">{inspection.vetName}</span>
            </>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </span>

        {/* Kooi */}
        <span className="truncate text-gray-700">
          {inspection.cageAtVet ? (
            <>
              <span className="mr-1 text-xs uppercase text-gray-400">Kooi:</span>
              <span className="font-medium">{inspection.cageAtVet}</span>
            </>
          ) : (
            <span className="text-gray-300">—</span>
          )}
        </span>

        {/* Badges (FIV / FeLV / uitkomst) */}
        <div className="flex flex-wrap items-center gap-1">
          {fivLabel && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              FIV: {fivLabel}
            </span>
          )}
          {felvLabel && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
              FeLV: {felvLabel}
            </span>
          )}
          {outcomeLabel && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              {outcomeLabel}
            </span>
          )}
        </div>

        {/* Acties */}
        <div className="flex shrink-0 items-center justify-end gap-1">
          {isConfirmDelete ? (
            <>
              <span className="text-xs text-gray-600">Verwijderen?</span>
              <button
                type="button"
                onClick={onConfirmDeleteAction}
                disabled={isPending}
                className="rounded-md bg-red-600 px-2.5 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isPending ? "..." : "Ja"}
              </button>
              <button
                type="button"
                onClick={onCancelDelete}
                className="rounded-md border border-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                Nee
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onStartEdit}
                aria-label="Bewerken"
                title="Bewerken"
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                aria-label="Verwijderen"
                title="Verwijderen"
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Beschrijving + notities (uitgelijnd onder kolom 2) */}
      {(inspection.catDescription || inspection.notes || inspection.recordedByName) && (
        <div className="mt-1 grid grid-cols-[7rem_1fr] gap-x-4 text-xs text-gray-500">
          <span aria-hidden="true" />
          <div className="space-y-0.5">
            {inspection.catDescription && <p>{inspection.catDescription}</p>}
            {inspection.notes && <p className="italic">{inspection.notes}</p>}
            {inspection.recordedByName && (
              <p className="text-gray-400">Geregistreerd door {inspection.recordedByName}</p>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function InspectionFormFields({
  draft,
  onChange,
}: {
  draft: DraftInspection;
  onChange: (next: DraftInspection) => void;
}) {
  function update<K extends keyof DraftInspection>(key: K, value: DraftInspection[K]) {
    onChange({ ...draft, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">Inspectiedatum *</label>
          <input
            type="date"
            value={draft.inspectionDate}
            onChange={(e) => update("inspectionDate", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">Dierenarts</label>
          <input
            type="text"
            value={draft.vetName}
            onChange={(e) => update("vetName", e.target.value)}
            placeholder="Naam dierenarts"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase text-gray-500">Katbeschrijving</label>
        <textarea
          value={draft.catDescription}
          onChange={(e) => update("catDescription", e.target.value)}
          rows={2}
          placeholder="bv. Cyperse kater, ~2 jaar, geen chip"
          className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">Kooi bij dierenarts</label>
          <input
            type="text"
            value={draft.cageAtVet}
            onChange={(e) => update("cageAtVet", e.target.value)}
            placeholder="Kooiennummer"
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">Uitkomst</label>
          <select
            value={draft.outcome}
            onChange={(e) => update("outcome", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">— Niet bepaald —</option>
            {CAMPAIGN_OUTCOMES.map((o) => (
              <option key={o} value={o}>{CAMPAIGN_OUTCOME_LABELS[o]}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">FIV-status</label>
          <select
            value={draft.fivStatus}
            onChange={(e) => update("fivStatus", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">— Niet getest —</option>
            {FIV_FELV_STATUSES.map((s) => (
              <option key={s} value={s}>{FIV_FELV_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase text-gray-500">FeLV-status</label>
          <select
            value={draft.felvStatus}
            onChange={(e) => update("felvStatus", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
          >
            <option value="">— Niet getest —</option>
            {FIV_FELV_STATUSES.map((s) => (
              <option key={s} value={s}>{FIV_FELV_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium uppercase text-gray-500">Notities</label>
        <textarea
          value={draft.notes}
          onChange={(e) => update("notes", e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm"
        />
      </div>
    </div>
  );
}
