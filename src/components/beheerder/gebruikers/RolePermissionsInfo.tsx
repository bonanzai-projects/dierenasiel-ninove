import { BACKOFFICE_ROLES } from "@/lib/constants";
import {
  PERMISSION_AREAS,
  ROLE_LABELS,
  accessForArea,
  accessLabel,
  extrasForArea,
} from "@/lib/permissions/explain";

/**
 * Overzicht van wat elke rol mag. Volledig afgeleid uit ROLE_PERMISSIONS —
 * zie de toelichting in `src/lib/permissions/explain.ts`.
 *
 * Een matrix in plaats van vijf lapjes tekst, omdat de vraag bijna altijd
 * vergelijkend is: "wat mag een coördinator méér dan een medewerker?". En een
 * leeg vakje beantwoordt "wat mag deze rol níet" duidelijker dan een zin.
 */
export default function RolePermissionsInfo({ open = false }: { open?: boolean }) {
  return (
    <details
      open={open}
      className="rounded-xl border border-gray-100 bg-white shadow-sm [&[open]_summary_svg]:rotate-180"
    >
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-6 py-4 text-sm font-semibold text-[#1b4332]">
        Wat mag elke rol?
        <svg
          className="h-4 w-4 shrink-0 text-gray-400 transition-transform"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-gray-100 px-6 py-4">
        <p className="mb-4 text-sm text-gray-600">
          Een rol bepaalt welke menu&apos;s iemand ziet en wat hij mag wijzigen. Een streepje
          betekent: geen toegang, het onderdeel verschijnt niet in zijn menu.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-left text-sm">
            <thead>
              <tr className="bg-[#1b4332] text-white">
                <th scope="col" className="py-2.5 pl-3 pr-4 font-semibold">
                  Onderdeel
                </th>
                {BACKOFFICE_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-3 py-2.5 font-semibold">
                    {ROLE_LABELS[role]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_AREAS.map((area) => (
                <tr key={area.key} className="border-b border-gray-100 align-top">
                  <th
                    scope="row"
                    className="bg-gray-100 py-2.5 pl-3 pr-4 font-medium text-gray-900"
                  >
                    {area.label}
                    {area.hint && (
                      <span className="mt-0.5 block text-xs font-normal text-gray-500">
                        {area.hint}
                      </span>
                    )}
                  </th>
                  {BACKOFFICE_ROLES.map((role) => {
                    const access = accessForArea(role, area);
                    const extras = extrasForArea(role, area);
                    return (
                      <td
                        key={role}
                        className={`px-3 py-2.5 ${
                          access === "geen" ? "text-gray-500" : "text-gray-700"
                        }`}
                      >
                        {accessLabel(access, area)}
                        {extras.length > 0 && (
                          <span className="mt-0.5 block text-xs text-gray-500">
                            + {extras.join(", ")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Dit overzicht wordt rechtstreeks uit de rechten in de code afgeleid — het kan dus niet
          verouderen ten opzichte van wat de app werkelijk toelaat.
        </p>
      </div>
    </details>
  );
}
