import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requirePermission } from "@/lib/permissions";
import { getCampaignReport } from "@/lib/queries/stray-cat-campaigns";
import { getMunicipalityLogoByName } from "@/lib/queries/municipality-logos";
import StrayCatCampaignsPdf from "@/components/beheerder/rapporten/StrayCatCampaignsPdf";
import { createElement } from "react";

export async function GET(request: NextRequest) {
  const permCheck = await requirePermission("report:generate");
  if (permCheck && !permCheck.success) {
    return new Response("Onvoldoende rechten", { status: 403 });
  }

  try {
    const params = request.nextUrl.searchParams;
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    const rawFrom = params.get("van") || undefined;
    const rawTo = params.get("tot") || undefined;
    const rawMunicipality = params.get("gemeente") || undefined;
    const rawStatus = params.get("status") || undefined;

    const dateFrom = rawFrom && datePattern.test(rawFrom) ? rawFrom : undefined;
    const dateTo = rawTo && datePattern.test(rawTo) ? rawTo : undefined;

    const [{ campaigns, stats }, logo] = await Promise.all([
      getCampaignReport({
        municipality: rawMunicipality,
        status: rawStatus,
        dateFrom,
        dateTo,
      }),
      rawMunicipality ? getMunicipalityLogoByName(rawMunicipality) : Promise.resolve(null),
    ]);

    // Pre-fetch het logo en geef als data-URL door — @react-pdf/renderer kan
    // remote URLs niet altijd betrouwbaar laden in de server-context, een data-URL
    // werkt overal. We baseren het mime-type op de response Content-Type (met
    // URL-extensie als fallback) zodat Vercel-Blob URLs met random suffix ook
    // herkend worden. Soft-deleted opdrachtgevers blijven werken: de blob is
    // bij soft-delete bewust behouden en getMunicipalityLogoByName filtert
    // niet op deletedAt.
    let logoDataUrl: string | undefined;
    if (logo?.logoUrl) {
      try {
        const res = await fetch(logo.logoUrl);
        if (!res.ok) {
          console.error(
            `logo fetch HTTP ${res.status} voor "${logo.name}": ${logo.logoUrl}`,
          );
        } else {
          const arrayBuffer = await res.arrayBuffer();
          const headerMime = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
          const urlExtMatch = (() => {
            try {
              const u = new URL(logo.logoUrl);
              return u.pathname.toLowerCase().match(/\.(png|jpe?g|webp|svg)$/);
            } catch {
              return null;
            }
          })();
          const extMime = (() => {
            switch (urlExtMatch?.[1]) {
              case "png": return "image/png";
              case "jpg":
              case "jpeg": return "image/jpeg";
              case "webp": return "image/webp";
              case "svg": return "image/svg+xml";
              default: return undefined;
            }
          })();
          const mime = headerMime && headerMime.startsWith("image/") ? headerMime : extMime;
          // @react-pdf/renderer's <Image> ondersteunt PNG, JPEG en WebP. SVG
          // vergt een aparte <Svg>-flow en wordt overgeslagen.
          if (mime && /^image\/(png|jpe?g|webp)$/.test(mime)) {
            const base64 = Buffer.from(arrayBuffer).toString("base64");
            logoDataUrl = `data:${mime};base64,${base64}`;
          } else {
            console.warn(
              `logo "${logo.name}" overgeslagen — niet-ondersteund mime: ${mime ?? "onbekend"}`,
            );
          }
        }
      } catch (err) {
        console.error("logo fetch failed:", err);
      }
    }

    const generatedAt = new Date().toLocaleDateString("nl-BE", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = createElement(StrayCatCampaignsPdf, {
      campaigns,
      stats,
      municipality: rawMunicipality,
      dateFrom,
      dateTo,
      logoUrl: logoDataUrl,
      generatedAt,
    }) as any;
    const buffer = await renderToBuffer(element);

    const dateStr = new Date().toISOString().split("T")[0];
    const safeMunicipality = rawMunicipality?.replace(/[^a-zA-Z0-9_-]/g, "_") ?? "alle";
    // Geen "R14" in de naam: dat is onze interne codering en het bestand gaat
    // naar een gemeentebestuur (Sven, 2026-08-10).
    const filename = `zwerfkattenbeleid-${safeMunicipality}-${dateStr}.pdf`;

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("PDF generation failed (zwerfkatten):", err);
    return new Response("Er ging iets mis bij het genereren van de PDF.", { status: 500 });
  }
}
