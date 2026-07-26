import { logAudit } from "@/lib/audit";

/**
 * Laag 3 van de read-only garantie (Epic 11, koerswijziging §3.1).
 *
 * Elke uitgaande oproep naar AnimalShelter wordt geregistreerd. Dat is het
 * bewijsstuk tegenover het bestuur van het asiel: het logboek toont dat er
 * uitsluitend gelezen wordt. Een belofte kan je niet controleren, een logboek wel.
 *
 * Er komt bewust géén request-body, token of credential in het logboek terecht —
 * alleen methode, pad en HTTP-status.
 */
export async function logOutboundCall(
  method: string,
  path: string,
  status: number,
): Promise<void> {
  await logAudit("animalshelter_api_call", "animalshelter_api", 0, null, {
    method,
    path,
    status,
  });
}
