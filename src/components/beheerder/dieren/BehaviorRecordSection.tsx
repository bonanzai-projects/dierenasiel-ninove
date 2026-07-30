"use client";

import { useState } from "react";
import BehaviorRecordForm from "./BehaviorRecordForm";
import BehaviorRecordList from "./BehaviorRecordList";
import type { BehaviorRecord, BehaviorRecordWithRecorder } from "@/types";

interface BehaviorRecordSectionProps {
  animalId: number;
  species: string;
  records: BehaviorRecordWithRecorder[];
  recordCount: number;
}

function isWednesdayReminderNeeded(records: BehaviorRecord[]): boolean {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 3=Wed
  if (dayOfWeek < 3) return false; // Before Wednesday

  // Check if there's a record for the current week (Mon-Sun)
  const mondayOfWeek = new Date(now);
  mondayOfWeek.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
  mondayOfWeek.setHours(0, 0, 0, 0);

  return !records.some((r) => {
    const recordDate = new Date(r.date);
    return recordDate >= mondayOfWeek;
  });
}

export default function BehaviorRecordSection({
  animalId,
  species,
  records,
  recordCount,
}: BehaviorRecordSectionProps) {
  const [view, setView] = useState<"list" | "form">("list");
  const [editingRecord, setEditingRecord] = useState<BehaviorRecordWithRecorder | null>(null);

  const isDog = species === "hond";
  const showReminder = isWednesdayReminderNeeded(records);

  function handleEdit(record: BehaviorRecordWithRecorder) {
    setEditingRecord(record);
    setView("form");
  }

  function handleCancel() {
    setEditingRecord(null);
    setView("list");
  }

  return (
    <div>
      {/* Wednesday reminder */}
      {showReminder && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            Het is woensdag — vergeet de wekelijkse gedragsfiche niet!
          </p>
        </div>
      )}

      {/* Frequentie-hint voor honden (Bijlage VIII B: minstens wekelijks in de eerste 3 weken) */}
      {isDog && (
        <p className="mb-3 text-xs text-gray-500">
          {recordCount} {recordCount === 1 ? "fiche" : "fiches"} ingevuld — minstens
          wekelijks tijdens de eerste 3 weken (Bijlage VIII B)
        </p>
      )}

      {/* Toggle buttons */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => { setView("list"); setEditingRecord(null); }}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            view === "list"
              ? "bg-[#1b4332] text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Overzicht ({recordCount})
        </button>
        <button
          type="button"
          onClick={() => { setEditingRecord(null); setView("form"); }}
          className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
            view === "form" && !editingRecord
              ? "bg-[#1b4332] text-white"
              : "border border-gray-300 text-gray-700 hover:bg-gray-50"
          }`}
        >
          Nieuwe fiche
        </button>
      </div>

      {/* Content */}
      {view === "list" ? (
        <BehaviorRecordList records={records} onEdit={handleEdit} />
      ) : (
        <BehaviorRecordForm
          animalId={animalId}
          existingRecord={editingRecord}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
