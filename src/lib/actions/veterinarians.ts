"use server";

import { db } from "@/lib/db";
import { veterinarians } from "@/lib/db/schema";
import { and, eq, ne, sql, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { veterinarianSchema } from "@/lib/validations/veterinarians";
import { vetKey } from "@/lib/veterinarians/format";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Story 10.81 (Sven) — de dierenartsenlijst. Zelfde opzet als de leverancierslijst
 * (13.16): een naam komt maar één keer voor, en een fout stuurt de ingevulde waarden
 * terug (React 19 zet het formulier na een action anders terug op zijn beginwaarden).
 */

export type VeterinarianRow = InferSelectModel<typeof veterinarians>;

const BESTAAT_AL = "Er bestaat al een dierenarts met die naam";
const OPSLAAN_MISLUKT = "Er ging iets mis bij het opslaan van de dierenarts.";

function readForm(formData: FormData) {
  const veld = (naam: string) => (formData.get(naam) as string) || "";
  return {
    name: veld("name"),
    practice: veld("practice"),
    street: veld("street"),
    houseNumber: veld("houseNumber"),
    postalCode: veld("postalCode"),
    city: veld("city"),
    phone: veld("phone"),
    mobile: veld("mobile"),
    email: veld("email"),
    orderNumber: veld("orderNumber"),
    notes: veld("notes"),
  };
}

type Waarden = ReturnType<typeof readForm>;
type VeldFouten = Partial<Record<keyof Waarden, string[]>>;

function foutAntwoord(waarden: Waarden, fieldErrors: VeldFouten): ActionResult<VeterinarianRow> {
  return { success: false, fieldErrors, values: waarden };
}

function algemeneFout(waarden: Waarden, error: string): ActionResult<VeterinarianRow> {
  return { success: false, error, values: waarden };
}

/** Draagt een andere fiche die naam al? Dezelfde sleutel als `vetKey`. */
async function naamBezet(naam: string, behalveId?: number): Promise<boolean> {
  const zelfdeNaam = sql`lower(trim(${veterinarians.name})) = ${vetKey(naam)}`;
  const [rij] = await db
    .select({ id: veterinarians.id })
    .from(veterinarians)
    .where(behalveId ? and(zelfdeNaam, ne(veterinarians.id, behalveId)) : zelfdeNaam)
    .limit(1);
  return Boolean(rij);
}

/** De lijst en de bezoekrapporten (die tonen de gegevens van de fiche). */
function vernieuw() {
  revalidatePath("/beheerder/medisch", "layout");
}

export async function createVeterinarian(
  _prev: ActionResult<VeterinarianRow> | null,
  formData: FormData,
): Promise<ActionResult<VeterinarianRow>> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = veterinarianSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

  try {
    if (await naamBezet(parsed.data.name)) return foutAntwoord(waarden, { name: [BESTAAT_AL] });

    const [record] = await db.insert(veterinarians).values(parsed.data).returning();
    await logAudit("create_veterinarian", "veterinarian", record.id, null, record);
    vernieuw();
    return { success: true, data: record };
  } catch {
    return algemeneFout(waarden, OPSLAAN_MISLUKT);
  }
}

export async function updateVeterinarian(
  _prev: ActionResult<VeterinarianRow> | null,
  formData: FormData,
): Promise<ActionResult<VeterinarianRow>> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige dierenarts" };

  const waarden = readForm(formData);
  const parsed = veterinarianSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

  try {
    const [old] = await db.select().from(veterinarians).where(eq(veterinarians.id, id)).limit(1);
    if (!old) return algemeneFout(waarden, "Dierenarts niet gevonden");

    // Enkel andere hoofdletters is geen andere dierenarts: dan valt er niets te botsen.
    if (vetKey(parsed.data.name) !== vetKey(old.name) && (await naamBezet(parsed.data.name, id))) {
      return foutAntwoord(waarden, { name: [BESTAAT_AL] });
    }

    const [record] = await db
      .update(veterinarians)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(veterinarians.id, id))
      .returning();

    await logAudit("update_veterinarian", "veterinarian", id, old, record);
    vernieuw();
    return { success: true, data: record };
  } catch {
    return algemeneFout(waarden, OPSLAAN_MISLUKT);
  }
}

/** De bezoekrapporten houden de naam; enkel de verwijzing naar de fiche verdwijnt (set null). */
export async function deleteVeterinarian(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("medical:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige dierenarts" };

  try {
    const [old] = await db.select().from(veterinarians).where(eq(veterinarians.id, id)).limit(1);
    if (!old) return { success: false, error: "Dierenarts niet gevonden" };

    await db.delete(veterinarians).where(eq(veterinarians.id, id));
    await logAudit("delete_veterinarian", "veterinarian", id, old, null);
    vernieuw();
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de dierenarts." };
  }
}
