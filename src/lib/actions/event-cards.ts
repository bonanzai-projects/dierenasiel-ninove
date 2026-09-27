"use server";

import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { eventCardDraws, eventCardSeries, eventCosts } from "@/lib/db/schema";
import { requirePermission } from "@/lib/permissions";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { isUniqueViolation } from "@/lib/db/errors";
import { formatAmount, parseAmount } from "@/lib/events/costs";
import {
  CARD_PRICE_DEFAULT,
  cardTotals,
  drawIssue,
  drawableNumbers,
  findSeriesOverlap,
  parseNumberList,
  pickNumber,
  seriesAmountCents,
  seriesRangeIssue,
  seriesSize,
  soldCount,
  unsoldIssues,
} from "@/lib/events/support-cards";
import {
  getCardDrawById,
  getCardRevenueLine,
  getCardSeriesById,
  getEventCardDraws,
  getEventCardSeries,
} from "@/lib/queries/event-cards";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/types";

/**
 * Epic 13, story 13.15 — genummerde steunkaarten. Zien zoals de kosten, aanpassen zoals de
 * kosten (`event:write`): Sven, "geldzaken enkel beheerders". De opbrengst van de afgerekende
 * reeksen staat automatisch als opbrengstlijn "Steunkaarten" bij kosten & opbrengsten
 * (keuze Johan), zodat netto, evaluatie en jaaroverzicht vanzelf meetellen.
 */

const fichePad = (eventId: number) => `/beheerder/evenementen/${eventId}`;
const OPBRENGST_BRON = "steunkaarten";

const heelGetal = (melding: string) => z.string().regex(/^\d{1,6}$/, melding).transform(Number);

const seriesSchema = z
  .object({
    eventId: z.string().regex(/^[1-9]\d{0,8}$/, "Ongeldig evenement").transform(Number),
    seller: z.string().trim().min(1, "Vul de verkoper in").max(120, "Naam mag max 120 tekens zijn"),
    numberFrom: heelGetal("Vul een nummer in"),
    numberTo: heelGetal("Vul een nummer in"),
    price: z.string(),
  })
  .superRefine((data, ctx) => {
    const reeks = seriesRangeIssue(data.numberFrom, data.numberTo);
    if (reeks) ctx.addIssue({ code: "custom", path: ["numberTo"], message: reeks });
    const prijs = parseAmount(data.price);
    if (!prijs.ok) ctx.addIssue({ code: "custom", path: ["price"], message: prijs.error });
    else if (prijs.value === 0) ctx.addIssue({ code: "custom", path: ["price"], message: "Een kaart kost meer dan € 0" });
  });

function fout(error: string, values?: Record<string, string>): ActionResult {
  return { success: false, error, ...(values ? { values } : {}) };
}

type ReeksRij = Awaited<ReturnType<typeof getEventCardSeries>>[number];

/**
 * De opdracht die de opbrengstlijn "Steunkaarten" op het totaal van de afgerekende reeksen
 * zet, berekend uit de reeksen zoals ze na de wijziging zijn. Bestaat de lijn niet (of werd
 * ze weggehaald), dan komt ze erbij zodra er iets afgerekend is. Niets afgerekend = geen
 * werkelijk bedrag, zoals een lijn die nog open staat. Null = er valt niets te schrijven.
 *
 * Bewust niet `async`: een drizzle-opdracht is "thenable", en een async functie die er een
 * teruggeeft, voert ze meteen uit — buiten de batch.
 */
function opbrengstOpdracht(
  eventId: number,
  lijn: { id: number } | null,
  reeksen: readonly ReeksRij[],
  userId: number | null,
) {
  const totaal = cardTotals(reeksen);
  const bedrag = totaal.settledSeries > 0 ? (totaal.amountCents / 100).toFixed(2) : null;
  if (lijn) {
    return db.update(eventCosts).set({ actualAmount: bedrag, updatedAt: new Date() }).where(eq(eventCosts.id, lijn.id));
  }
  if (bedrag === null) return null;
  return db.insert(eventCosts).values({
    eventId,
    kind: "opbrengst",
    category: "tombola",
    description: "Steunkaarten",
    actualAmount: bedrag,
    source: OPBRENGST_BRON,
    sortOrder: Math.floor(Date.now() / 1000),
    createdByUserId: userId,
  });
}

/**
 * Code-review 13.15 - de reeks en de opbrengstlijn in een batch (= een transactie bij
 * neon-http, zoals 13.16): anders kon een afgerekende reeks blijven staan naast een
 * opbrengst die niet meer klopt.
 */
async function schrijfMetOpbrengst(
  eventId: number,
  reeksOpdracht: Parameters<typeof db.batch>[0][number],
  reeksenNaWijziging: readonly ReeksRij[],
  userId: number | null,
) {
  const lijn = await getCardRevenueLine(eventId);
  const opbrengst = opbrengstOpdracht(eventId, lijn, reeksenNaWijziging, userId);
  await (opbrengst ? db.batch([reeksOpdracht, opbrengst]) : reeksOpdracht);
}

/** Een reeks nummers meegeven aan een verkoper. */
export async function createCardSeries(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const values = {
    eventId: String(formData.get("eventId") ?? ""),
    seller: String(formData.get("seller") ?? ""),
    numberFrom: String(formData.get("numberFrom") ?? ""),
    numberTo: String(formData.get("numberTo") ?? ""),
    price: String(formData.get("price") ?? "") || String(CARD_PRICE_DEFAULT),
  };
  const parsed = seriesSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: "Validatie mislukt",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      values,
    };
  }
  const { eventId, seller, numberFrom, numberTo } = parsed.data;
  const prijs = parseAmount(parsed.data.price);
  const price = String(prijs.ok && prijs.value !== null ? prijs.value : CARD_PRICE_DEFAULT);

  try {
    const botsing = findSeriesOverlap(await getEventCardSeries(eventId), numberFrom, numberTo);
    if (botsing) {
      return fout(
        `Nummers ${numberFrom}–${numberTo} overlappen met de reeks van ${botsing.seller} (${botsing.numberFrom}–${botsing.numberTo}).`,
        values,
      );
    }
    const session = await getSession();
    const nieuw = { eventId, seller, numberFrom, numberTo, price, createdByUserId: session?.userId ?? null };
    await db.insert(eventCardSeries).values(nieuw);
    await logAudit("event_card_series.created", "event", eventId, null, nieuw);
    revalidatePath(fichePad(eventId));
    return { success: true, data: undefined, message: `${seller} kreeg de nummers ${numberFrom}–${numberTo} mee.` };
  } catch {
    return fout("Er ging iets mis bij het bewaren van de reeks.", values);
  }
}

/** Afrekenen: de onverkochte nummers komen terug; verkocht = de rest van de reeks. */
export async function settleCardSeries(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const id = Number(formData.get("id"));
  const unsold = String(formData.get("unsold") ?? "");
  const values = { unsold };
  if (!Number.isInteger(id) || id <= 0) return fout("Ongeldige reeks");

  const lijst = parseNumberList(unsold);
  if (!lijst.ok) return fout(lijst.error, values);

  try {
    const reeks = await getCardSeriesById(id);
    if (!reeks) return fout("Reeks niet gevonden");

    const problemen = unsoldIssues(reeks, lijst.numbers, await getEventCardDraws(reeks.eventId));
    if (problemen.length > 0) return fout(problemen.join(". ") + ".", values);

    const session = await getSession();
    const nu = new Date();
    const naWijziging = (await getEventCardSeries(reeks.eventId)).map((s) =>
      s.id === id ? { ...s, unsoldNumbers: lijst.numbers, settledAt: nu } : s,
    );
    await schrijfMetOpbrengst(
      reeks.eventId,
      db
        .update(eventCardSeries)
        .set({ unsoldNumbers: lijst.numbers, settledAt: nu, settledByUserId: session?.userId ?? null })
        .where(eq(eventCardSeries.id, id)),
      naWijziging,
      session?.userId ?? null,
    );
    await logAudit("event_card_series.settled", "event", reeks.eventId, reeks, { id, unsoldNumbers: lijst.numbers });
    revalidatePath(fichePad(reeks.eventId));

    const afgerekend = { ...reeks, unsoldNumbers: lijst.numbers, settledAt: nu };
    const verkocht = soldCount(afgerekend) ?? 0;
    return {
      success: true,
      data: undefined,
      message: `Afgerekend: ${reeks.seller} verkocht ${verkocht} van ${seriesSize(reeks)} kaarten (${formatAmount(seriesAmountCents(afgerekend) / 100)}).`,
    };
  } catch {
    return fout("Er ging iets mis bij het afrekenen.", values);
  }
}

/** Terug naar "uitgedeeld" — om een vergissing recht te zetten. */
export async function reopenCardSeries(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fout("Ongeldige reeks");

  try {
    const reeks = await getCardSeriesById(id);
    if (!reeks) return fout("Reeks niet gevonden");
    const session = await getSession();
    const naWijziging = (await getEventCardSeries(reeks.eventId)).map((s) =>
      s.id === id ? { ...s, unsoldNumbers: [], settledAt: null } : s,
    );
    await schrijfMetOpbrengst(
      reeks.eventId,
      db.update(eventCardSeries).set({ settledAt: null, settledByUserId: null, unsoldNumbers: [] }).where(eq(eventCardSeries.id, id)),
      naWijziging,
      session?.userId ?? null,
    );
    await logAudit("event_card_series.reopened", "event", reeks.eventId, reeks, { id });
    revalidatePath(fichePad(reeks.eventId));
    return { success: true, data: undefined, message: `De reeks van ${reeks.seller} staat weer open.` };
  } catch {
    return fout("Er ging iets mis bij het heropenen.");
  }
}

/** Een reeks weghalen — niet zolang er een winnend nummer uit komt. */
export async function deleteCardSeries(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fout("Ongeldige reeks");

  try {
    const reeks = await getCardSeriesById(id);
    if (!reeks) return fout("Reeks niet gevonden");
    const winnaars = (await getEventCardDraws(reeks.eventId)).filter(
      (d) => d.number >= reeks.numberFrom && d.number <= reeks.numberTo,
    );
    if (winnaars.length > 0) {
      return fout(
        `Uit deze reeks werd al getrokken (${winnaars.map((d) => d.number).join(", ")}). Haal die winnende nummers eerst weg.`,
      );
    }
    const session = await getSession();
    const naWijziging = (await getEventCardSeries(reeks.eventId)).filter((s) => s.id !== id);
    await schrijfMetOpbrengst(
      reeks.eventId,
      db.delete(eventCardSeries).where(eq(eventCardSeries.id, id)),
      naWijziging,
      session?.userId ?? null,
    );
    await logAudit("event_card_series.deleted", "event", reeks.eventId, reeks, null);
    revalidatePath(fichePad(reeks.eventId));
    return { success: true, data: undefined, message: `Reeks van ${reeks.seller} weggehaald.` };
  } catch {
    return fout("Er ging iets mis bij het weghalen van de reeks.");
  }
}

const prijsTekst = (formData: FormData) => String(formData.get("prize") ?? "").trim().slice(0, 200) || null;

/** Een zelf getrokken winnend nummer invullen. */
export async function addCardDraw(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const values = { number: String(formData.get("number") ?? ""), prize: String(formData.get("prize") ?? "") };
  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId) || eventId <= 0) return fout("Ongeldig evenement");
  if (!/^\d{1,6}$/.test(values.number)) {
    return { success: false, error: "Validatie mislukt", fieldErrors: { number: ["Vul het winnende nummer in"] }, values };
  }
  const number = Number(values.number);

  try {
    const [reeksen, trekkingen] = await Promise.all([getEventCardSeries(eventId), getEventCardDraws(eventId)]);
    const probleem = drawIssue(reeksen, trekkingen, number);
    if (probleem) return { success: false, error: "Validatie mislukt", fieldErrors: { number: [probleem] }, values };

    const session = await getSession();
    const nieuw = { eventId, number, prize: prijsTekst(formData), drawnByApp: false, createdByUserId: session?.userId ?? null };
    await db.insert(eventCardDraws).values(nieuw);
    await logAudit("event_card_draw.added", "event", eventId, null, nieuw);
    revalidatePath(fichePad(eventId));
    return { success: true, data: undefined, message: `Nummer ${number} staat bij de winnaars.` };
  } catch (err) {
    if (isUniqueViolation(err)) return fout(`Nummer ${number} werd al getrokken.`, values);
    return fout("Er ging iets mis bij het bewaren van het winnende nummer.", values);
  }
}

/** De app laten trekken: willekeurig uit de verkochte nummers van afgerekende reeksen. */
export async function drawCardByApp(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const eventId = Number(formData.get("eventId"));
  if (!Number.isInteger(eventId) || eventId <= 0) return fout("Ongeldig evenement");

  try {
    const [reeksen, trekkingen] = await Promise.all([getEventCardSeries(eventId), getEventCardDraws(eventId)]);
    const number = pickNumber(drawableNumbers(reeksen, trekkingen), randomInt);
    if (number === null) {
      return fout("Er is niets om uit te trekken: de app trekt enkel uit verkochte nummers van reeksen die al afgerekend zijn.");
    }
    const session = await getSession();
    const nieuw = { eventId, number, prize: prijsTekst(formData), drawnByApp: true, createdByUserId: session?.userId ?? null };
    await db.insert(eventCardDraws).values(nieuw);
    await logAudit("event_card_draw.drawn_by_app", "event", eventId, null, nieuw);
    revalidatePath(fichePad(eventId));
    const verkoper = reeksen.find((s) => number >= s.numberFrom && number <= s.numberTo)?.seller;
    return {
      success: true,
      data: undefined,
      message: `Getrokken: nummer ${number}${verkoper ? ` (verkocht door ${verkoper})` : ""}.`,
    };
  } catch (err) {
    if (isUniqueViolation(err)) return fout("Iemand trok net tegelijk. Probeer het opnieuw.");
    return fout("Er ging iets mis bij het trekken.");
  }
}

export async function deleteCardDraw(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) return fout(permCheck.error ?? "Onvoldoende rechten");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return fout("Ongeldig winnend nummer");

  try {
    const trekking = await getCardDrawById(id);
    if (!trekking) return fout("Winnend nummer niet gevonden");
    await db.delete(eventCardDraws).where(eq(eventCardDraws.id, id));
    await logAudit("event_card_draw.deleted", "event", trekking.eventId, trekking, null);
    revalidatePath(fichePad(trekking.eventId));
    return { success: true, data: undefined, message: `Nummer ${trekking.number} is weggehaald bij de winnaars.` };
  } catch {
    return fout("Er ging iets mis bij het weghalen van het winnende nummer.");
  }
}
