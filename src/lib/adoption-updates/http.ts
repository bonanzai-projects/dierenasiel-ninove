import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";

/**
 * Story 10.74 — gedeeld door de routes van de berichten na adoptie.
 */

/** `null` = toegang; anders het antwoord dat de route meteen teruggeeft (401/403). */
export async function adoptionRouteAccess(
  permission: "adoption:read" | "adoption:write",
): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  if (!hasPermission(session.role, permission)) {
    return NextResponse.json({ error: "Onvoldoende rechten" }, { status: 403 });
  }
  return null;
}

/** RFC 5987: encodeURIComponent laat ' ( ) * staan, die horen ook gecodeerd. */
function rfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * Content-Disposition met de naam zoals de adoptant hem stuurde: een veilige
 * ASCII-versie voor oude browsers en de echte naam (UTF-8) voor de rest.
 */
export function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${rfc5987(fileName)}`;
}
