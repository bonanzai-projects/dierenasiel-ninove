import { contactLinks, type SupplierAddress, type SupplierContactInfo } from "@/lib/events/suppliers";

const ICOON = { gsm: "☎", mail: "✉", website: "🌐", adres: "📍" } as const;

interface Props {
  supplier: (Pick<SupplierContactInfo, "phone" | "email" | "website"> & SupplierAddress) | null;
}

/**
 * Story 13.16 — gsm, mail en website van een leverancier, klikbaar onder een regel.
 * Story 13.18 — en het adres, als link naar Google Maps.
 */
export default function SupplierContact({ supplier }: Props) {
  if (!supplier) return null;
  const links = contactLinks(supplier);
  if (links.length === 0) return null;

  return (
    <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      {links.map((l) => (
        <a
          key={l.kind}
          href={l.href}
          {...(l.kind === "website" || l.kind === "adres"
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          className="text-[#2d6a4f] hover:underline"
        >
          <span aria-hidden="true">{ICOON[l.kind]} </span>
          {l.label}
        </a>
      ))}
    </span>
  );
}
