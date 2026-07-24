"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCalendarEvent } from "@/lib/actions/calendar-events";

export default function DeleteEventButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (!window.confirm("Dit kalender-item verwijderen?")) return;
    startTransition(async () => {
      const res = await deleteCalendarEvent(id);
      if (res.success) router.push("/beheerder/kalender");
      else setError(res.error ?? "Verwijderen mislukt");
    });
  }

  return (
    <div>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "Verwijderen..." : "Verwijderen"}
      </button>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
