"use client";

import { useActionState, useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { StrayCatCampaign, ActionResult } from "@/types";
import type { InspectionWithCages, MedicalInspectionWithRecorder } from "@/lib/queries/stray-cat-campaigns";
import {
  deployCagesAction,
  linkAnimalAction,
  updateCampaignBasicsAction,
  setCampaignStatusAction,
} from "@/lib/actions/stray-cat-campaigns";
import { CAMPAIGN_STATUS_LABELS } from "@/lib/constants";
import AddressMap from "./AddressMap";
import CampaignStatusBadge from "./CampaignStatusBadge";
import CampaignPhotoGallery from "./CampaignPhotoGallery";
import CampaignEmailAttachments from "./CampaignEmailAttachments";
import InspectionLogSection from "./InspectionLogSection";
import { parseCageCodes } from "@/lib/stray-cats/inspection-cages";
import MedicalInspectionsSection from "./MedicalInspectionsSection";
import type { CampaignAttachment, CampaignPhoto } from "@/lib/queries/stray-cat-campaigns";
import type { MunicipalityLogo, Cage } from "@/types";

interface Props {
  campaign: StrayCatCampaign;
  availableCats: { id: number; name: string }[];
  occupiedCages: Record<string, number>;
  inspections: InspectionWithCages[];
  medicalInspections: MedicalInspectionWithRecorder[];
  attachments?: CampaignAttachment[];
  opdrachtgevers?: MunicipalityLogo[];
  cages?: Cage[];
  photos?: CampaignPhoto[];
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p role="alert" className="mt-1 text-sm text-red-600">{errors[0]}</p>;
}

// --- Verzoekgegevens (editbaar) sectie ---
async function handleUpdateBasics(_prev: ActionResult | null, formData: FormData) {
  return updateCampaignBasicsAction({
    campaignId: Number(formData.get("campaignId")),
    requestDate: formData.get("requestDate") as string,
    municipality: formData.get("municipality") as string,
    address: formData.get("address") as string,
    remarks: (formData.get("remarks") as string) || "",
  });
}

function BasicsSection({
  campaign,
  opdrachtgevers,
}: {
  campaign: StrayCatCampaign;
  opdrachtgevers: MunicipalityLogo[];
}) {
  const [state, formAction, isPending] = useActionState(handleUpdateBasics, null);
  const router = useRouter();
  // Gecontroleerd zodat het kaartje het adresveld volgt tijdens het bewerken
  // (Story 10.40) én de invoer niet wegvalt na een server-actie.
  const [address, setAddress] = useState(campaign.address ?? "");
  const [municipality, setMunicipality] = useState(campaign.municipality ?? "");

  useEffect(() => {
    if (state?.success) router.refresh();
  }, [state, router]);

  // Als de huidige gemeente niet voorkomt in de actieve opdrachtgevers-lijst
  // (bv. legacy- of soft-deleted naam), tonen we hem toch als optie zodat de
  // dropdown een geldige waarde heeft.
  const optionNames = new Set(opdrachtgevers.map((o) => o.name));
  const showLegacyOption =
    !!campaign.municipality && !optionNames.has(campaign.municipality);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="campaignId" value={campaign.id} />
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Verzoekgegevens bijgewerkt.
        </div>
      )}
      {state && !state.success && state.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="basics-requestDate" className="block text-sm font-medium text-gray-700">
            Datum verzoek *
          </label>
          <input
            type="date"
            id="basics-requestDate"
            name="requestDate"
            defaultValue={campaign.requestDate}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
          <FieldError errors={fieldErrors?.requestDate as string[] | undefined} />
        </div>

        <div>
          <label htmlFor="basics-municipality" className="block text-sm font-medium text-gray-700">
            Gemeente / Opdrachtgever *
          </label>
          <select
            id="basics-municipality"
            name="municipality"
            value={municipality}
            onChange={(e) => setMunicipality(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          >
            {opdrachtgevers.length === 0 && !showLegacyOption && (
              <option value="" disabled>— Geen opdrachtgevers in bibliotheek —</option>
            )}
            {showLegacyOption && (
              <option value={campaign.municipality}>
                {campaign.municipality} (niet in bibliotheek)
              </option>
            )}
            {opdrachtgevers.map((o) => (
              <option key={o.id} value={o.name}>{o.name}</option>
            ))}
          </select>
          <FieldError errors={fieldErrors?.municipality as string[] | undefined} />
        </div>

        <div>
          <label htmlFor="basics-address" className="block text-sm font-medium text-gray-700">
            Adres / locatie *
          </label>
          <input
            type="text"
            id="basics-address"
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          />
          <FieldError errors={fieldErrors?.address as string[] | undefined} />
        </div>
      </div>

      {/* Story 10.40: kaartje van de locatie (Sven: "makkelijk om te situeren"). */}
      <AddressMap
        address={address}
        municipality={municipality}
        lookup={{
          lat: campaign.latitude,
          lng: campaign.longitude,
          geocodedAddress: campaign.geocodedAddress,
          geocodeMatch: campaign.geocodeMatch,
        }}
      />

      <div>
        <label htmlFor="basics-remarks" className="block text-sm font-medium text-gray-700">
          Opmerkingen
        </label>
        <textarea
          id="basics-remarks"
          name="remarks"
          rows={2}
          defaultValue={campaign.remarks ?? ""}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Verzoekgegevens opslaan"}
        </button>
      </div>
    </form>
  );
}

// --- Kooi-uitzetting sectie (auto-save bij elke onChange) ---
function DeployCagesSection({
  campaignId,
  occupiedCages,
  cages,
  initialDeploymentDate,
  initialCageNumbers,
}: {
  campaignId: number;
  occupiedCages: Record<string, number>;
  cages: Cage[];
  initialDeploymentDate: string | null;
  initialCageNumbers: string | null;
}) {
  const router = useRouter();
  const initialList = (initialCageNumbers ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const [selectedCages, setSelectedCages] = useState<string[]>(initialList);
  const [deploymentDate, setDeploymentDate] = useState<string>(initialDeploymentDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [isPending, startTransition] = useTransition();

  function persist(nextDate: string, nextCages: string[]) {
    setError(null);
    startTransition(async () => {
      const result = await deployCagesAction({
        campaignId,
        cageDeploymentDate: nextDate,
        cageNumbers: nextCages.join(","),
      });
      if (!result.success) {
        setError(result.error || "Opslaan mislukt");
      } else {
        setSavedAt(new Date());
        router.refresh();
      }
    });
  }

  function toggleCage(num: string) {
    const next = selectedCages.includes(num)
      ? selectedCages.filter((x) => x !== num)
      : [...selectedCages, num];
    setSelectedCages(next);
    persist(deploymentDate, next);
  }

  function onDateChange(value: string) {
    setDeploymentDate(value);
    persist(value, selectedCages);
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      <div>
        <label htmlFor="cageDeploymentDate" className="block text-sm font-medium text-gray-700">
          Datum kooi-uitzetting
        </label>
        <input
          type="date"
          id="cageDeploymentDate"
          value={deploymentDate}
          onChange={(e) => onDateChange(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 sm:w-64"
        />
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label className="block text-sm font-medium text-gray-700">
            Kooiennummers <span className="text-xs font-normal text-gray-500">(meerdere mogelijk)</span>
          </label>
          <span className="text-xs text-gray-500">
            {selectedCages.length > 0 ? `${selectedCages.length} geselecteerd` : "Geen geselecteerd"}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
          {cages.length === 0 && (
            <p className="col-span-full text-xs text-gray-500">
              Nog geen kooien in de bibliotheek. Voeg er één toe via de kooi-bibliotheek.
            </p>
          )}
          {cages.map((cage) => {
            const num = cage.code;
            const occupiedBy = occupiedCages[num];
            const isSelected = selectedCages.includes(num);
            // De eigen campagne staat niet in de occupiedCages-map (we filteren
            // hem uit in getOccupiedCageNumbers), dus we hoeven niet expliciet
            // te checken of occupiedBy === campaignId.
            const isOccupied = occupiedBy !== undefined;
            return (
              <label
                key={cage.id}
                title={isOccupied ? `In gebruik in campagne #${occupiedBy}` : undefined}
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  isOccupied
                    ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400"
                    : isSelected
                      ? "border-amber-500 bg-amber-50 text-amber-900"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={isOccupied}
                  onChange={() => toggleCage(num)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 disabled:cursor-not-allowed"
                />
                <span className="font-medium">{num}</span>
                {isOccupied && <span className="ml-auto text-xs">#{occupiedBy}</span>}
              </label>
            );
          })}
        </div>
      </div>
      <p className="text-xs italic text-gray-500">
        {isPending
          ? "Opslaan..."
          : savedAt
            ? `Automatisch bewaard om ${savedAt.toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" })}`
            : "Wijzigingen worden automatisch bewaard."}
      </p>
    </div>
  );
}

// --- Dier koppelen sectie ---
function AnimalLinkSection({ campaignId, availableCats, currentLinkedAnimalId }: {
  campaignId: number;
  availableCats: { id: number; name: string }[];
  currentLinkedAnimalId: number | null;
}) {
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(currentLinkedAnimalId);
  const [state, setState] = useState<{ success?: boolean; error?: string } | null>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleLink() {
    if (!selectedAnimalId) return;
    setIsPending(true);
    const result = await linkAnimalAction({ campaignId, linkedAnimalId: selectedAnimalId });
    setState(result);
    setIsPending(false);
    if (result.success) router.refresh();
  }

  return (
    <div className="space-y-3">
      {state && !state.success && state.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</div>
      )}
      {state?.success && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Dier succesvol gekoppeld.</div>
      )}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label htmlFor="linkedAnimal" className="block text-sm font-medium text-gray-700">
            Koppel aan dier in systeem
          </label>
          <select
            id="linkedAnimal"
            value={selectedAnimalId ?? ""}
            onChange={(e) => setSelectedAnimalId(e.target.value ? Number(e.target.value) : null)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:ring-emerald-500"
          >
            <option value="">Selecteer een kat...</option>
            {availableCats.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={handleLink}
          disabled={isPending || !selectedAnimalId}
          className="rounded-lg bg-[#1b4332] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d6a4f] disabled:opacity-50"
        >
          {isPending ? "Bezig..." : "Koppelen"}
        </button>
      </div>
    </div>
  );
}

// --- Status-keuze sectie ---
// Korte beschrijving van wat elke status betekent (informatief).
const STATUS_DESCRIPTIONS: Record<string, string> = {
  open: "Campagne is aangemaakt, nog geen kooien uitgezet.",
  kooien_geplaatst: "Kooien zijn uitgezet en wachten op vangst.",
  in_behandeling: "Eén of meer katten gevangen, in opvolging bij dierenarts.",
  afgerond: "Alle kooien opgehaald en campagne afgesloten.",
};

const STATUS_OPTIONS = ["open", "kooien_geplaatst", "in_behandeling", "afgerond"] as const;

function StatusSelector({ campaignId, currentStatus }: { campaignId: number; currentStatus: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: string) {
    if (next === currentStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await setCampaignStatusAction(campaignId, next);
      if (!result.success) {
        setError(result.error || "Status wijzigen mislukt");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="campaign-status" className="text-sm font-medium text-gray-700">
          Status
        </label>
        <select
          id="campaign-status"
          value={currentStatus}
          onChange={(e) => handleChange(e.target.value)}
          disabled={isPending}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:ring-emerald-500 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {CAMPAIGN_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <span className="text-xs italic text-gray-500">
          {STATUS_DESCRIPTIONS[currentStatus]}
        </span>
        {isPending && <span className="text-xs text-gray-400">opslaan...</span>}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

// --- Hoofd component ---
export default function CampaignDetailForm({ campaign, availableCats, occupiedCages, inspections, medicalInspections, attachments = [], opdrachtgevers = [], cages = [], photos = [] }: Props) {
  return (
    <div className="space-y-6">
      {/* Header + manuele status-keuze */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1b4332]">
            Campagne #{campaign.id}
          </h2>
          <CampaignStatusBadge status={campaign.status} />
        </div>
        <StatusSelector campaignId={campaign.id} currentStatus={campaign.status} />
      </div>

      {/* Verzoekgegevens (editbaar) */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Verzoekgegevens</h3>
        <BasicsSection campaign={campaign} opdrachtgevers={opdrachtgevers} />
      </div>

      {/* Foto's */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
          Foto&apos;s {photos.length > 0 && <span className="ml-1 text-gray-400">({photos.length})</span>}
        </h3>
        <CampaignPhotoGallery campaignId={campaign.id} photos={photos} />
      </div>

      {/* Mails van gemeente (Story 10.17) */}
      <CampaignEmailAttachments campaignId={campaign.id} attachments={attachments} />

      {/* Kooi-uitzetting — altijd editable */}
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Kooi-uitzetting</h3>
        <DeployCagesSection
          campaignId={campaign.id}
          occupiedCages={occupiedCages}
          cages={cages}
          initialDeploymentDate={campaign.cageDeploymentDate}
          initialCageNumbers={campaign.cageNumbers}
        />
      </div>

      {/* Kooi-inspecties — log van rondes om kooien te controleren */}
      <InspectionLogSection
        campaignId={campaign.id}
        inspections={inspections}
        deployedCages={parseCageCodes(campaign.cageNumbers)}
      />

      {/* Medische inspecties — 1 rij per kat naar de dierenarts (CRUD) */}
      <MedicalInspectionsSection campaignId={campaign.id} inspections={medicalInspections} />

      {/* Dier koppelen (alleen bij afgerond + uitkomst = geadopteerd) */}
      {campaign.status === "afgerond" && campaign.outcome === "geadopteerd" && (
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">Dier koppeling</h3>
          <AnimalLinkSection
            campaignId={campaign.id}
            availableCats={availableCats}
            currentLinkedAnimalId={campaign.linkedAnimalId}
          />
        </div>
      )}
    </div>
  );
}
