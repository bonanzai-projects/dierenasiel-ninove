"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteVeterinarian, type VeterinarianRow } from "@/lib/actions/veterinarians";
import { vetAddress } from "@/lib/veterinarians/format";
import VeterinarianForm from "./VeterinarianForm";

interface Props {
  veterinarians: VeterinarianRow[];
  canWrite: boolean;
}

/**
 * Story 10.81 (Sven: "van bepaalde dierenartsen een fiche kunnen bijhouden om dan op
 * bepaalde plaatsen te gebruiken om uit lijst te kiezen") — de dierenartsenlijst.
 * Eerst gebruikt in het R11-bezoekrapport.
 */
export default function VeterinariansManager({ veterinarians, canWrite }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [nieuw, setNieuw] = useState(false);
  const [bewerktId, setBewerktId] = useState<number | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  function verwijderen(v: VeterinarianRow) {
    const vraag = `Dierenarts "${v.name}" verwijderen? Bezoekrapporten houden de naam; enkel de gegevens van de fiche verdwijnen.`;
    if (!window.confirm(vraag)) return;
    setFout(null);
    startTransition(async () => {
      const res = await deleteVeterinarian(v.id);
      if (res.success) router.refresh();
      else setFout(res.error ?? "Verwijderen mislukt");
    });
  }

  const kolommen = canWrite ? 5 : 4;

  return (
    <section className="rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
      {fout && <p className="mb-2 text-sm text-red-600">{fout}</p>}

      {veterinarians.length === 0 ? (
        <p className="text-sm text-gray-400">
          Nog geen dierenartsen. Voeg er een toe; daarna kies je die bij een bezoekrapport uit de lijst.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Dierenartsen</caption>
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                <th scope="col" className="py-1 font-medium">Naam</th>
                <th scope="col" className="py-1 font-medium">Adres</th>
                <th scope="col" className="py-1 font-medium">Contact</th>
                <th scope="col" className="py-1 font-medium">Ordenummer</th>
                {canWrite && <th scope="col" className="py-1" />}
              </tr>
            </thead>
            <tbody>
              {veterinarians.map((v) =>
                bewerktId === v.id ? (
                  <tr key={v.id}>
                    <td colSpan={kolommen} className="py-2">
                      <VeterinarianForm veterinarian={v} onDone={() => setBewerktId(null)} />
                    </td>
                  </tr>
                ) : (
                  <tr key={v.id} className="border-b border-gray-100 align-top">
                    <td className="py-1.5 pr-2">
                      <span className="font-medium text-gray-900">{v.name}</span>
                      {v.practice && <span className="block text-xs text-gray-600">{v.practice}</span>}
                      {v.notes && <span className="block text-xs text-gray-500">{v.notes}</span>}
                    </td>
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{vetAddress(v) || <span className="text-gray-300">—</span>}</td>
                    <td className="py-1.5 pr-2 text-xs text-gray-700">
                      {[v.phone, v.mobile, v.email].filter(Boolean).length === 0 ? (
                        <span className="text-gray-300">—</span>
                      ) : (
                        <>
                          {v.phone && <span className="block">{v.phone}</span>}
                          {v.mobile && <span className="block">{v.mobile}</span>}
                          {v.email && <span className="block break-all">{v.email}</span>}
                        </>
                      )}
                    </td>
                    <td className="py-1.5 pr-2 text-xs text-gray-700">{v.orderNumber || <span className="text-gray-300">—</span>}</td>
                    {canWrite && (
                      <td className="py-1.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setNieuw(false);
                            setBewerktId(v.id);
                          }}
                          className="rounded px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                        >
                          Bewerken
                        </button>
                        <button
                          type="button"
                          onClick={() => verwijderen(v)}
                          className="rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          Verwijderen
                        </button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      {canWrite &&
        (nieuw ? (
          <div className="mt-3">
            <VeterinarianForm onDone={() => setNieuw(false)} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setBewerktId(null);
              setNieuw(true);
            }}
            className="mt-3 text-sm font-medium text-[#2d6a4f] hover:underline"
          >
            + Nieuwe dierenarts
          </button>
        ))}
    </section>
  );
}
