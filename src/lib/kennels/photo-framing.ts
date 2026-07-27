/**
 * Story 10.44 — waar een dierfoto wordt uitgesneden in een klein kader.
 *
 * Sven zag op het grondplan geregeld een dier zonder kop: de foto wordt over de
 * volledige tegel uitgerekt (`cover`) en wat niet past valt weg. Gemeten op de
 * echte data (2026-07-27, 21 dieren met foto in een gepositioneerd hok):
 *
 * - kenneltegels zijn overwegend **liggend** — mediaan verhouding 1.50;
 * - dierfoto's zijn overwegend **staande** gsm-foto's — verhouding 0.58 tot 0.90;
 * - bij een gecentreerde uitsnede valt daardoor **40 à 60% van de hoogte weg**
 *   (Baloe 61%, Hera 53%, Beauty 52%, Puck 50%) — en dat is net de band waarin
 *   de kop zit, want die staat bovenaan in de foto.
 *
 * Daarom snijden we hoger uit: liever de poten kwijt dan de kop. Bij foto's die
 * niet in de hoogte bijgesneden worden heeft deze waarde geen enkel effect, dus
 * ze kost daar niets.
 *
 * Nagerekend op Beauty (1470×2048 in een tegel van 1.50): zichtbaar blijft de
 * band van 13% tot 61% van de foto — de kop zit rond 15–30%.
 */
export const ANIMAL_PHOTO_FOCUS = "50% 25%";
