import type { BackofficeRole } from "@/types";
import { BACKOFFICE_ROLES } from "@/lib/constants";
import { ROLE_LABELS, describeRole } from "@/lib/permissions/explain";

/**
 * Korte samenvatting van één rol, bedoeld onder het keuzelijstje in het
 * formulier. Toont bewust ook wat de rol *niet* mag: dat is meestal de vraag
 * die iemand heeft op het moment dat hij een rol aanklikt.
 */
export default function RoleSummary({ role }: { role: string }) {
  if (!BACKOFFICE_ROLES.includes(role as BackofficeRole)) return null;

  const { mag, magNiet } = describeRole(role as BackofficeRole);

  return (
    <div className="mt-2 rounded-lg bg-gray-50 px-3 py-2 text-xs leading-relaxed">
      <p className="text-gray-700">
        <span className="font-semibold">{ROLE_LABELS[role as BackofficeRole]} mag: </span>
        {mag.map((area) => `${area.label} (${area.description})`).join(" · ")}
      </p>
      {magNiet.length > 0 && (
        <p className="mt-1 text-gray-500">
          <span className="font-semibold">Niet: </span>
          {magNiet.map((area) => area.label).join(" · ")}
        </p>
      )}
      {magNiet.length === 0 && (
        <p className="mt-1 text-gray-500">Deze rol heeft toegang tot alles.</p>
      )}
    </div>
  );
}
