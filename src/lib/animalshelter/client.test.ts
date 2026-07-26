import { describe, it, expect, vi, beforeEach } from "vitest";
import fixture from "./__fixtures__/animals.json";
import { fetchAllAnimals, fetchCategory } from "./client";
import { readFromAnimalShelter } from "./http";

vi.mock("./http", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./http")>()),
  readFromAnimalShelter: vi.fn(),
}));

const mockRead = vi.mocked(readFromAnimalShelter);
const honden = fixture.filter((a) => a.categorie === "dogs");
const katten = fixture.filter((a) => a.categorie === "cats");
const andere = fixture.filter((a) => a.categorie === "other");

beforeEach(() => vi.clearAllMocks());

describe("fetchCategory", () => {
  it("leest één categorie via het doorgeefluik", async () => {
    mockRead.mockResolvedValueOnce(honden);
    const dieren = await fetchCategory("dogs");

    expect(mockRead).toHaveBeenCalledWith("/category/dogs");
    expect(dieren.map((d) => d.naam)).toEqual(["Rocky"]);
  });

  it("valideert het antwoord en gooit bij onzin", async () => {
    mockRead.mockResolvedValueOnce({ dieren: [] });
    await expect(fetchCategory("cats")).rejects.toThrow(/lijst/i);
  });
});

describe("fetchAllAnimals", () => {
  it("haalt de drie categorieën op en levert één lijst", async () => {
    mockRead
      .mockResolvedValueOnce(honden)
      .mockResolvedValueOnce(katten)
      .mockResolvedValueOnce(andere);

    const dieren = await fetchAllAnimals();

    expect(mockRead.mock.calls.map((c) => c[0])).toEqual([
      "/category/dogs",
      "/category/cats",
      "/category/other",
    ]);
    expect(dieren).toHaveLength(3);
    expect(dieren.map((d) => d.categorie)).toEqual(["dogs", "cats", "other"]);
  });

  it("doet exact drie oproepen — het detailendpoint voegt niets toe", async () => {
    mockRead.mockResolvedValue([]);
    await fetchAllAnimals();
    expect(mockRead).toHaveBeenCalledTimes(3);
  });

  it("laat een fout in één categorie de hele ophaalronde stoppen", async () => {
    mockRead.mockResolvedValueOnce(honden).mockRejectedValueOnce(new Error("HTTP 503"));
    await expect(fetchAllAnimals()).rejects.toThrow("HTTP 503");
  });
});
