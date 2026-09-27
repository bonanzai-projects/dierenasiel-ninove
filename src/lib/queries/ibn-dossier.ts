import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditLogs, users } from "@/lib/db/schema";
import { IBN_DOSSIER_MAILED_ACTION } from "@/lib/animals/ibn-dossier";

export { IBN_DOSSIER_MAILED_ACTION };

/**
 * Story 10.72 — "Eerder verstuurd": wie mailde het IBN-dossier wanneer naar wie.
 * Uit het logboek (index op entity_type + entity_id), geen aparte tabel.
 */

export interface IbnDossierMailing {
  /** ISO-tijdstip; de fiche zet het om naar Belgische tijd. */
  sentAt: string;
  to: string[];
  by: string | null;
}

interface LogRegel {
  createdAt: Date;
  newValue: unknown;
  userName: string | null;
}

export function toIbnDossierMailings(regels: LogRegel[]): IbnDossierMailing[] {
  return regels.map((r) => {
    const waarde = (r.newValue && typeof r.newValue === "object" ? r.newValue : {}) as { to?: unknown };
    const to = Array.isArray(waarde.to) ? waarde.to.filter((a): a is string => typeof a === "string") : [];
    return { sentAt: r.createdAt.toISOString(), to, by: r.userName };
  });
}

export async function getIbnDossierMailings(animalId: number): Promise<IbnDossierMailing[]> {
  try {
    const regels = await db
      .select({ createdAt: auditLogs.createdAt, newValue: auditLogs.newValue, userName: users.name })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(
        and(
          eq(auditLogs.entityType, "animal"),
          eq(auditLogs.entityId, animalId),
          eq(auditLogs.action, IBN_DOSSIER_MAILED_ACTION),
        ),
      )
      .orderBy(desc(auditLogs.createdAt))
      .limit(10);
    return toIbnDossierMailings(regels);
  } catch (err) {
    console.error("getIbnDossierMailings query failed:", err);
    return [];
  }
}
