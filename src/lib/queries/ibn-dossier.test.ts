import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLimit, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockLeftJoin = vi.fn().mockReturnValue({ where: mockWhere });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom });
  return { mockLimit, mockSelect };
});

vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }));

import { getIbnDossierMailings, toIbnDossierMailings, IBN_DOSSIER_MAILED_ACTION } from "./ibn-dossier";

// Story 10.72 — "Eerder verstuurd": wie mailde het IBN-dossier wanneer naar wie (uit het logboek).

describe("toIbnDossierMailings", () => {
  it("haalt datum, ontvangers en afzender uit de logboekregels", () => {
    expect(
      toIbnDossierMailings([
        {
          createdAt: new Date("2026-09-25T12:00:00Z"),
          newValue: { to: ["wijk@politie.be", "dwv@vlaanderen.be"], resendId: "re_1" },
          userName: "Sven",
        },
      ]),
    ).toEqual([{ sentAt: "2026-09-25T12:00:00.000Z", to: ["wijk@politie.be", "dwv@vlaanderen.be"], by: "Sven" }]);
  });

  it("verdraagt een onvolledige regel", () => {
    expect(
      toIbnDossierMailings([{ createdAt: new Date("2026-09-25T12:00:00Z"), newValue: null, userName: null }]),
    ).toEqual([{ sentAt: "2026-09-25T12:00:00.000Z", to: [], by: null }]);
    expect(
      toIbnDossierMailings([
        { createdAt: new Date("2026-09-25T12:00:00Z"), newValue: { to: ["a@b.be", 7] }, userName: null },
      ])[0].to,
    ).toEqual(["a@b.be"]);
  });
});

describe("getIbnDossierMailings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockReset();
  });

  it("geeft de laatste 10 verzendingen, nieuwste eerst", async () => {
    mockLimit.mockResolvedValue([
      { createdAt: new Date("2026-09-25T12:00:00Z"), newValue: { to: ["wijk@politie.be"] }, userName: "Sven" },
    ]);
    const r = await getIbnDossierMailings(315);
    expect(mockLimit).toHaveBeenCalledWith(10);
    expect(r).toEqual([{ sentAt: "2026-09-25T12:00:00.000Z", to: ["wijk@politie.be"], by: "Sven" }]);
    expect(IBN_DOSSIER_MAILED_ACTION).toBe("animal.ibn_dossier_emailed");
  });

  it("geeft een lege lijst als de databank faalt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockLimit.mockRejectedValue(new Error("db weg"));
    expect(await getIbnDossierMailings(315)).toEqual([]);
  });
});
