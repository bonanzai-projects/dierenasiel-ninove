"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateCaregivers } from "@/lib/actions/shelter-settings";

interface Props {
  caregivers: string[];
}

/**
 * Story 10.27: compacte CRUD voor de verzorgerslijst die op het gedragsrapport
 * (R4 — Bijlage VIII B) verschijnt. Elke wijziging (toevoegen/bewerken/verwijderen)
 * wordt meteen opgeslagen via updateCaregivers (vervangt de volledige lijst).
 */
export default function CaregiversSettingPanel({ caregivers }: Props) {
  const [list, setList] = useState<string[]>(caregivers);
  const [newName, setNewName] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const router = useRouter();

  function persist(next: string[]) {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateCaregivers(next);
      if (result.success) {
        setList(next);
        setFeedback({ type: "ok", msg: "✓ Opgeslagen." });
        router.refresh();
      } else {
        setFeedback({ type: "error", msg: result.error || "Opslaan mislukt." });
      }
    });
  }

  function addName() {
    const name = newName.trim();
    if (!name) return;
    if (list.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setFeedback({ type: "error", msg: "Deze naam staat al in de lijst." });
      return;
    }
    persist([...list, name]);
    setNewName("");
  }

  function startEdit(index: number) {
    setEditingIndex(index);
    setEditValue(list[index]);
    setFeedback(null);
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const name = editValue.trim();
    if (!name) return;
    const next = list.map((n, i) => (i === editingIndex ? name : n));
    persist(next);
    setEditingIndex(null);
    setEditValue("");
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditValue("");
  }

  function removeName(index: number) {
    persist(list.filter((_, i) => i !== index));
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="font-heading text-lg font-bold text-[#1b4332]">Verzorgers (gedragsrapport)</h2>
      <p className="mt-1 text-sm text-gray-500">
        De personen (verzorgers) die de dieren verzorgen in het asiel. Deze lijst verschijnt op het
        gedragsrapport (R4 — Bijlage VIII B).
      </p>

      <ul className="mt-4 divide-y divide-gray-100 rounded-lg border border-gray-200">
        {list.length === 0 && (
          <li className="px-3 py-3 text-sm italic text-gray-400">Nog geen verzorgers toegevoegd.</li>
        )}
        {list.map((name, index) => (
          <li key={index} className="flex items-center gap-2 px-3 py-2">
            {editingIndex === index ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  autoFocus
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") cancelEdit();
                  }}
                  className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={isPending}
                  className="rounded-md bg-[#1b4332] px-3 py-1 text-xs font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
                >
                  Opslaan
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  Annuleren
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{name}</span>
                <button
                  type="button"
                  onClick={() => startEdit(index)}
                  disabled={isPending}
                  className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                  aria-label={`Bewerk ${name}`}
                  title="Bewerken"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => removeName(index)}
                  disabled={isPending}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Verwijder ${name}`}
                  title="Verwijderen"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setFeedback(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") addName();
          }}
          placeholder="Naam van een verzorger…"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
        />
        <button
          type="button"
          onClick={addName}
          disabled={isPending || newName.trim().length === 0}
          className="rounded-md bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          Toevoegen
        </button>
      </div>

      {feedback && (
        <p className={`mt-2 text-sm ${feedback.type === "ok" ? "text-emerald-700" : "text-red-600"}`}>
          {feedback.msg}
        </p>
      )}
    </div>
  );
}
