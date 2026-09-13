"use server";

import { db } from "@/lib/db";
import { eventCosts, eventMaterials, suppliers } from "@/lib/db/schema";
import { and, eq, ne, sql, type InferSelectModel } from "drizzle-orm";
import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { supplierSchema } from "@/lib/validations/suppliers";
import { supplierKey } from "@/lib/events/suppliers";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

export type SupplierRow = InferSelectModel<typeof suppliers>;

const BESTAAT_AL = "Er bestaat al een leverancier met die naam";
const OPSLAAN_MISLUKT = "Er ging iets mis bij het opslaan van de leverancier.";

function readForm(formData: FormData) {
  return {
    name: (formData.get("name") as string) || "",
    phone: (formData.get("phone") as string) || "",
    email: (formData.get("email") as string) || "",
    website: (formData.get("website") as string) || "",
    notes: (formData.get("notes") as string) || "",
    street: (formData.get("street") as string) || "",
    houseNumber: (formData.get("houseNumber") as string) || "",
    postalCode: (formData.get("postalCode") as string) || "",
    city: (formData.get("city") as string) || "",
  };
}

type Waarden = ReturnType<typeof readForm>;
type VeldFouten = Partial<Record<keyof Waarden, string[]>>;

function foutAntwoord(waarden: Waarden, fieldErrors: VeldFouten): ActionResult<SupplierRow> {
  return { success: false, fieldErrors, values: waarden };
}

/**
 * Ook een algemene fout stuurt de ingevulde waarden terug: React 19 zet het formulier
 * na de action terug op zijn beginwaarden, en dan is wat de gebruiker typte weg.
 */
function algemeneFout(waarden: Waarden, error: string): ActionResult<SupplierRow> {
  return { success: false, error, values: waarden };
}

/** Draagt een andere leverancier die naam al? Dezelfde sleutel als `supplierKey`. */
async function naamBezet(naam: string, behalveId?: number): Promise<boolean> {
  const zelfdeNaam = sql`lower(trim(${suppliers.name})) = ${supplierKey(naam)}`;
  const [rij] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(behalveId ? and(zelfdeNaam, ne(suppliers.id, behalveId)) : zelfdeNaam)
    .limit(1);
  return Boolean(rij);
}

/** De lijst, en de fiches: die tonen de gegevens onder hun regels. */
function vernieuw() {
  revalidatePath("/beheerder/evenementen", "layout");
}

export async function createSupplier(
  _prev: ActionResult<SupplierRow> | null,
  formData: FormData,
): Promise<ActionResult<SupplierRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const waarden = readForm(formData);
  const parsed = supplierSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

  try {
    if (await naamBezet(parsed.data.name)) return foutAntwoord(waarden, { name: [BESTAAT_AL] });

    const [record] = await db.insert(suppliers).values(parsed.data).returning();
    await logAudit("create_supplier", "supplier", record.id, null, record);
    vernieuw();
    return { success: true, data: record };
  } catch {
    return algemeneFout(waarden, OPSLAAN_MISLUKT);
  }
}

export async function updateSupplier(
  _prev: ActionResult<SupplierRow> | null,
  formData: FormData,
): Promise<ActionResult<SupplierRow>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige leverancier" };

  const waarden = readForm(formData);
  const parsed = supplierSchema.safeParse(waarden);
  if (!parsed.success) return foutAntwoord(waarden, parsed.error.flatten().fieldErrors);

  try {
    const [old] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!old) return algemeneFout(waarden, "Leverancier niet gevonden");

    const nieuweNaam = parsed.data.name;
    // Enkel andere hoofdletters is geen andere leverancier: dan valt er niets te botsen.
    if (supplierKey(nieuweNaam) !== supplierKey(old.name) && (await naamBezet(nieuweNaam, id))) {
      return foutAntwoord(waarden, { name: [BESTAAT_AL] });
    }

    const nu = new Date();
    const lijstWijziging = db
      .update(suppliers)
      .set({ ...parsed.data, updatedAt: nu })
      .where(eq(suppliers.id, id))
      .returning();

    let record: SupplierRow;
    if (nieuweNaam !== old.name) {
      // Eén bron: de regels dragen de naam als tekst, dus een hernoeming gaat mee —
      // anders verliezen ze hun contactgegevens. Ook een loutere hoofdletterwijziging.
      // Eén batch is bij Neon over HTTP één transactie: de lijst en de regels wijzigen
      // samen, of geen van beide (review 13.16).
      const oudeSleutel = supplierKey(old.name);
      const [bijgewerkt] = await db.batch([
        lijstWijziging,
        db
          .update(eventCosts)
          .set({ supplier: nieuweNaam, updatedAt: nu })
          .where(sql`lower(trim(${eventCosts.supplier})) = ${oudeSleutel}`),
        db
          .update(eventMaterials)
          .set({ supplier: nieuweNaam, updatedAt: nu })
          .where(sql`lower(trim(${eventMaterials.supplier})) = ${oudeSleutel}`),
      ]);
      record = bijgewerkt[0];
    } else {
      [record] = await lijstWijziging;
    }

    await logAudit("update_supplier", "supplier", id, old, record);
    vernieuw();
    return { success: true, data: record };
  } catch {
    return algemeneFout(waarden, OPSLAAN_MISLUKT);
  }
}

/** De regels houden hun naam; enkel de contactgegevens verdwijnen. */
export async function deleteSupplier(id: number): Promise<ActionResult<{ id: number }>> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return { success: false, error: permCheck.error };
  if (!Number.isInteger(id) || id <= 0) return { success: false, error: "Ongeldige leverancier" };

  try {
    const [old] = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!old) return { success: false, error: "Leverancier niet gevonden" };

    await db.delete(suppliers).where(eq(suppliers.id, id));
    await logAudit("delete_supplier", "supplier", id, old, null);
    vernieuw();
    return { success: true, data: { id } };
  } catch {
    return { success: false, error: "Er ging iets mis bij het verwijderen van de leverancier." };
  }
}
