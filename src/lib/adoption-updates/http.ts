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
