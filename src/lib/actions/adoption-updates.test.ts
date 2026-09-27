import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const mockInsertReturning = vi.fn();
  const mockInsertValues = vi.fn().mockReturnValue({ returning: mockInsertReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });
  const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
  const mockDelete = vi.fn().mockReturnValue({ where: mockDeleteWhere });
  return {
    mockInsertReturning, mockInsertValues, mockInsert, mockDeleteWhere, mockDelete,
    mockRequirePermission: vi.fn(), mockGetSession: vi.fn(), mockLogAudit: vi.fn(), mockRevalidate: vi.fn(),
    mockGetAnimalById: vi.fn(), mockGetLatestContractId: vi.fn(), mockGetUpdate: vi.fn(), mockGetFile: vi.fn(),
    mockDeletePrivateFiles: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db: { insert: h.mockInsert, delete: h.mockDelete } }));
vi.mock("@/lib/db/schema", () => ({
  adoptionUpdates: { id: "adoption_updates.id" },
  adoptionUpdateFiles: { id: "adoption_update_files.id" },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })) }));
vi.mock("@/lib/permissions", () => ({ requirePermission: h.mockRequirePermission }));
vi.mock("@/lib/auth/session", () => ({ getSession: h.mockGetSession }));
vi.mock("@/lib/audit", () => ({ logAudit: h.mockLogAudit }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidate }));
vi.mock("@/lib/queries/animals", () => ({ getAnimalById: h.mockGetAnimalById }));
vi.mock("@/lib/queries/adoption-updates", () => ({
  getLatestContractIdForAnimal: h.mockGetLatestContractId,
  getAdoptionUpdateWithFiles: h.mockGetUpdate,
  getAdoptionUpdateFile: h.mockGetFile,
}));
vi.mock("@/lib/adoption-updates/storage", () => ({ deletePrivateFiles: h.mockDeletePrivateFiles }));

import { createAdoptionUpdate, deleteAdoptionUpdate, deleteAdoptionUpdateFile } from "./adoption-updates";

// Story 10.74 — berichten na adoptie bewaren en verwijderen.

const invoer = {
  animalId: 315,
  receivedOn: "2026-09-20",
  channel: "whatsapp",
  sender: "Sarah Peeters",
  message: "Bo stelt het goed!",
  fileCount: 2,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  h.mockRequirePermission.mockResolvedValue(undefined);
  h.mockGetSession.mockResolvedValue({ userId: 3, email: "sven@x.be", name: "Sven", role: "beheerder" });
  h.mockGetAnimalById.mockResolvedValue({ id: 315, name: "Bo" });
  h.mockGetLatestContractId.mockResolvedValue(7);
  h.mockInsertReturning.mockResolvedValue([{ id: 12 }]);
  h.mockDeletePrivateFiles.mockResolvedValue(undefined);
});

describe("createAdoptionUpdate", () => {
  it("bewaart het bericht bij het dier en zijn contract", async () => {
    const r = await createAdoptionUpdate(invoer);

    expect(h.mockRequirePermission).toHaveBeenCalledWith("adoption:write");
    expect(h.mockInsertValues).toHaveBeenCalledWith({
      animalId: 315,
      contractId: 7,
      receivedOn: "2026-09-20",
      channel: "whatsapp",
      sender: "Sarah Peeters",
      message: "Bo stelt het goed!",
      createdBy: 3,
    });
    expect(h.mockLogAudit).toHaveBeenCalledWith("adoption_update.create", "animal", 315, null, {
      updateId: 12, channel: "whatsapp", receivedOn: "2026-09-20", fileCount: 2,
    });
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/dieren/315");
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/adoptie/contracten/7");
    expect(r).toEqual({ success: true, data: { id: 12 } });
  });

  it("werkt ook zonder contract", async () => {
    h.mockGetLatestContractId.mockResolvedValue(null);
    await createAdoptionUpdate(invoer);
    expect(h.mockInsertValues).toHaveBeenCalledWith(expect.objectContaining({ contractId: null }));
  });

  it("geeft de eerste fout terug en bewaart niets bij ongeldige invoer", async () => {
    const r = await createAdoptionUpdate({ ...invoer, message: "", fileCount: 0 });
    expect(r).toMatchObject({ success: false, error: "Schrijf een bericht of voeg minstens één bestand toe." });
    expect(h.mockInsert).not.toHaveBeenCalled();
  });

  it("weigert zonder schrijfrechten", async () => {
    h.mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect(await createAdoptionUpdate(invoer)).toEqual({ success: false, error: "Onvoldoende rechten" });
    expect(h.mockInsert).not.toHaveBeenCalled();
  });

  it("weigert voor een onbekend dier", async () => {
    h.mockGetAnimalById.mockResolvedValue(null);
    expect(await createAdoptionUpdate(invoer)).toEqual({ success: false, error: "Dier niet gevonden." });
  });
});

describe("deleteAdoptionUpdate", () => {
  beforeEach(() => {
    h.mockGetUpdate.mockResolvedValue({
      id: 12, animalId: 315, contractId: 7, pathnames: ["adoptie-berichten/315/12/a.jpg", "adoptie-berichten/315/12/b.eml"],
    });
  });

  it("verwijdert het bericht én zijn bestanden uit de private opslag", async () => {
    const r = await deleteAdoptionUpdate(12);
    expect(h.mockRequirePermission).toHaveBeenCalledWith("adoption:write");
    expect(h.mockDeletePrivateFiles).toHaveBeenCalledWith(["adoptie-berichten/315/12/a.jpg", "adoptie-berichten/315/12/b.eml"]);
    expect(h.mockDelete).toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("adoption_update.delete", "animal", 315, { updateId: 12, files: 2 }, null);
    expect(h.mockRevalidate).toHaveBeenCalledWith("/beheerder/dieren/315");
    expect(r).toEqual({ success: true, data: undefined });
  });

  it("verwijdert het bericht toch als de opslag even faalt, en meldt het in het serverlog", async () => {
    h.mockDeletePrivateFiles.mockRejectedValue(new Error("blob weg"));
    const r = await deleteAdoptionUpdate(12);
    expect(r).toEqual({ success: true, data: undefined });
    expect(h.mockDelete).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it("meldt een onbekend bericht", async () => {
    h.mockGetUpdate.mockResolvedValue(null);
    expect(await deleteAdoptionUpdate(99)).toEqual({ success: false, error: "Bericht niet gevonden." });
    expect(h.mockDelete).not.toHaveBeenCalled();
  });

  it("weigert zonder schrijfrechten", async () => {
    h.mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });
    expect(await deleteAdoptionUpdate(12)).toEqual({ success: false, error: "Onvoldoende rechten" });
    expect(h.mockDeletePrivateFiles).not.toHaveBeenCalled();
  });
});

describe("deleteAdoptionUpdateFile", () => {
  it("verwijdert één bestand uit de opslag en de databank", async () => {
    h.mockGetFile.mockResolvedValue({
      id: 40, updateId: 12, animalId: 315, contractId: null, pathname: "adoptie-berichten/315/12/a.jpg", fileName: "a.jpg", mimeType: "image/jpeg",
    });
    const r = await deleteAdoptionUpdateFile(40);
    expect(h.mockDeletePrivateFiles).toHaveBeenCalledWith(["adoptie-berichten/315/12/a.jpg"]);
    expect(h.mockDelete).toHaveBeenCalled();
    expect(h.mockLogAudit).toHaveBeenCalledWith("adoption_update.file_delete", "animal", 315, { updateId: 12, fileId: 40, fileName: "a.jpg" }, null);
    expect(r).toEqual({ success: true, data: undefined });
  });

  it("meldt een onbekend bestand", async () => {
    h.mockGetFile.mockResolvedValue(null);
    expect(await deleteAdoptionUpdateFile(99)).toEqual({ success: false, error: "Bestand niet gevonden." });
  });
});
