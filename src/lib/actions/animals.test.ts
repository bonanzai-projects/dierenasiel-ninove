import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks
const {
  mockReturning, mockValues, mockInsert,
  mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
  mockSelectReturning, mockSelectWhere, mockSelectLimit,
  mockRequirePermission, mockLogAudit, mockRevalidatePath,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues });

  const mockUpdateReturning = vi.fn();
  const mockUpdateWhere = vi.fn().mockReturnValue({ returning: mockUpdateReturning });
  const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateWhere });
  const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

  const mockSelectLimit = vi.fn();
  const mockSelectWhere = vi.fn().mockReturnValue({ limit: mockSelectLimit });
  const mockSelectReturning = vi.fn().mockReturnValue({ where: mockSelectWhere });

  const mockRequirePermission = vi.fn();
  const mockLogAudit = vi.fn();
  const mockRevalidatePath = vi.fn();
  return {
    mockReturning, mockValues, mockInsert,
    mockUpdateReturning, mockUpdateWhere, mockUpdateSet, mockUpdate,
    mockSelectReturning, mockSelectWhere, mockSelectLimit,
    mockRequirePermission, mockLogAudit, mockRevalidatePath,
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    insert: mockInsert,
    update: mockUpdate,
    select: vi.fn().mockReturnValue({ from: mockSelectReturning }),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/db/schema", () => ({
  animals: Symbol("animals"),
}));

vi.mock("@/lib/permissions", () => ({
  requirePermission: mockRequirePermission,
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mockLogAudit,
}));

import { createAnimalIntake, updateAnimal } from "./animals";
import { animals } from "@/lib/db/schema";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(data)) {
    fd.append(key, value);
  }
  return fd;
}

const validFormData = {
  name: "Rex",
  species: "hond",
  gender: "reu",
  breed: "Mechelse Herder",
  color: "bruin",
  intakeDate: "2026-02-26",
  intakeReason: "afstand",
};

describe("createAnimalIntake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockReturning.mockResolvedValue([{
      id: 1,
      name: "Rex",
      slug: "rex",
      species: "hond",
      gender: "reu",
      status: "beschikbaar",
      isInShelter: true,
    }]);
    // Auto-barcode update for dogs
    mockUpdateReturning.mockResolvedValue([{
      id: 1,
      name: "Rex",
      slug: "rex",
      species: "hond",
      gender: "reu",
      status: "beschikbaar",
      isInShelter: true,
      barcode: "DOG-1",
    }]);
  });

  it("requires animal:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Onvoldoende rechten");
    }
  });

  it("returns fieldErrors when validation fails", async () => {
    const result = await createAnimalIntake(null, makeFormData({ name: "", species: "hond", gender: "" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors!.name).toBeDefined();
      expect(result.fieldErrors!.gender).toBeDefined();
    }
  });

  it("creates animal with correct defaults (status=beschikbaar, isInShelter=true)", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "beschikbaar",
        isInShelter: true,
      }),
    );
  });

  it("generates slug from name", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "rex",
      }),
    );
  });

  it("passes all form fields to db.insert", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Rex",
        species: "hond",
        gender: "reu",
        breed: "Mechelse Herder",
        color: "bruin",
        intakeDate: "2026-02-26",
        intakeReason: "afstand",
      }),
    );
  });

  it("inserts into animals table", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockInsert).toHaveBeenCalledWith(animals);
  });

  it("calls logAudit after successful creation", async () => {
    const result = await createAnimalIntake(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
    expect(mockLogAudit).toHaveBeenCalledWith(
      "create_animal",
      "animal",
      1,
      null,
      expect.objectContaining({ id: 1, name: "Rex" }),
    );
  });

  it("returns success with created animal data", async () => {
    const result = await createAnimalIntake(null, makeFormData(validFormData));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(expect.objectContaining({
        id: 1,
        name: "Rex",
        slug: "rex",
      }));
    }
  });

  it("stores intake_metadata for shelter pickup", async () => {
    const fd = makeFormData({
      ...validFormData,
      isPickedUpByShelter: "true",
      "intakeMetadata.melderNaam": "Jan Janssens",
      "intakeMetadata.melderLocatie": "Brusselsesteenweg 123",
      "intakeMetadata.melderDatum": "2026-02-25",
    });

    await createAnimalIntake(null, fd);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isPickedUpByShelter: true,
        intakeMetadata: {
          melderNaam: "Jan Janssens",
          melderLocatie: "Brusselsesteenweg 123",
          melderDatum: "2026-02-25",
        },
      }),
    );
  });

  // Sven-feedback 2026-07-24: bij een vondeling moeten adres + naam melder
  // bewaard worden, ook als iemand het dier komt brengen (geen ophaling).
  it("stores intake_metadata for a vondeling without shelter pickup", async () => {
    const fd = makeFormData({
      ...validFormData,
      intakeReason: "zwerfhond",
      "intakeMetadata.melderNaam": "Marie Peeters",
      "intakeMetadata.melderLocatie": "Geraardsbergsestraat 4, Ninove",
      "intakeMetadata.melderDatum": "2026-07-24",
    });

    await createAnimalIntake(null, fd);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isPickedUpByShelter: false,
        intakeMetadata: expect.objectContaining({
          melderNaam: "Marie Peeters",
          melderLocatie: "Geraardsbergsestraat 4, Ninove",
          melderDatum: "2026-07-24",
        }),
      }),
    );
  });

  // Story 10.36: vrij tekstveld "reden van inbeslagname" opslaan bij intake.
  it("stores ibnReason for an IBN intake", async () => {
    const fd = makeFormData({
      ...validFormData,
      intakeReason: "ibn",
      ibnReason: "Verwaarlozing — dier zonder water aangetroffen",
    });

    await createAnimalIntake(null, fd);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        ibnReason: "Verwaarlozing — dier zonder water aangetroffen",
      }),
    );
  });

  it("returns field error on duplicate slug (unique constraint)", async () => {
    mockReturning.mockRejectedValue(Object.assign(new Error("unique violation"), { code: "23505" }));

    const result = await createAnimalIntake(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns graceful error on DB failure", async () => {
    mockReturning.mockRejectedValue(new Error("Connection refused"));

    const result = await createAnimalIntake(null, makeFormData(validFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  // IBN intake tests
  it("calculates ibnDecisionDeadline = intakeDate + 60 days for IBN intake", async () => {
    const fd = makeFormData({
      ...validFormData,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
      pvNr: "PV-2026-001",
      intakeDate: "2026-02-26",
    });

    await createAnimalIntake(null, fd);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierNr: "DWV-2026-12345",
        pvNr: "PV-2026-001",
        ibnDecisionDeadline: "2026-04-27",
      }),
    );
  });

  it("does not set ibnDecisionDeadline for non-IBN intake", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierNr: null,
        pvNr: null,
        ibnDecisionDeadline: null,
      }),
    );
  });

  // Sven-feedback 2026-07-24: dossier-/PV-nummer komen later → registratie mag
  // niet blokkeren wanneer ze ontbreken.
  it("registreert een IBN-dier zonder dossier-/PV-nummer", async () => {
    const fd = makeFormData({
      ...validFormData,
      intakeReason: "ibn",
    });

    const result = await createAnimalIntake(null, fd);

    expect(result.success).toBe(true);
  });

  it("stores betrokkenInstanties in intakeMetadata for IBN", async () => {
    const fd = makeFormData({
      ...validFormData,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
      pvNr: "PV-2026-001",
      isPickedUpByShelter: "true",
      "intakeMetadata.melderNaam": "Politie Ninove",
      "intakeMetadata.betrokkenInstanties": "Politiezone Ninove, Dierenwelzijn Vlaanderen",
    });

    await createAnimalIntake(null, fd);

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        intakeMetadata: expect.objectContaining({
          betrokkenInstanties: "Politiezone Ninove, Dierenwelzijn Vlaanderen",
        }),
      }),
    );
  });

  // Story 10.23: sterilisatie/castratie — datum + door-asiel bij intake
  it("saves isNeutered, neuteredDate, neuteredByShelter when provided at intake", async () => {
    await createAnimalIntake(null, makeFormData({
      ...validFormData,
      isNeutered: "true",
      neuteredDate: "2024-03-15",
      neuteredByShelter: "false",
    }));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: true,
        neuteredDate: "2024-03-15",
        neuteredByShelter: false,
      }),
    );
  });

  // Story 10.29: geen keuze meegestuurd = onbekend (null), niet "Nee".
  it("saves isNeutered=null with null neuteredDate/neuteredByShelter when omitted", async () => {
    await createAnimalIntake(null, makeFormData(validFormData));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: null,
        neuteredDate: null,
        neuteredByShelter: null,
      }),
    );
  });

  it("saves isNeutered=false when 'Nee' is explicitly selected", async () => {
    await createAnimalIntake(null, makeFormData({ ...validFormData, isNeutered: "false" }));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: false,
        neuteredDate: null,
        neuteredByShelter: null,
      }),
    );
  });

  it("saves isNeutered=null when 'Onbekend' is selected", async () => {
    await createAnimalIntake(null, makeFormData({ ...validFormData, isNeutered: "onbekend" }));

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({ isNeutered: null }),
    );
  });
});

const existingAnimal = {
  id: 1,
  name: "Rex",
  slug: "rex",
  aliasName: null,
  species: "hond",
  gender: "reu",
  breed: "Mechelse Herder",
  color: "bruin",
  status: "beschikbaar",
  isOnWebsite: false,
  isFeatured: false,
};

const updateFormData = {
  id: "1",
  name: "Rex Updated",
  gender: "reu",
  breed: "Border Collie",
  color: "zwart-wit",
  isOnWebsite: "true",
  isFeatured: "false",
};

describe("updateAnimal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequirePermission.mockResolvedValue(undefined);
    mockLogAudit.mockResolvedValue(undefined);
    mockSelectLimit.mockResolvedValue([existingAnimal]);
    mockUpdateReturning.mockResolvedValue([{
      ...existingAnimal,
      name: "Rex Updated",
      slug: "rex-updated",
      breed: "Border Collie",
      color: "zwart-wit",
      isOnWebsite: true,
      updatedAt: new Date(),
    }]);
  });

  it("requires animal:write permission", async () => {
    mockRequirePermission.mockResolvedValue({ success: false, error: "Onvoldoende rechten" });

    const result = await updateAnimal(null, makeFormData(updateFormData));

    expect(mockRequirePermission).toHaveBeenCalledWith("animal:write");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Onvoldoende rechten");
    }
  });

  it("returns validation error when data is invalid", async () => {
    const result = await updateAnimal(null, makeFormData({ id: "1", name: "" }));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors).toBeDefined();
      expect(result.fieldErrors!.name).toBeDefined();
    }
  });

  it("saves changes and returns updated animal", async () => {
    const result = await updateAnimal(null, makeFormData(updateFormData));

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Rex Updated");
    }
  });

  it("updates slug when name changes", async () => {
    await updateAnimal(null, makeFormData(updateFormData));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "rex-updated",
      }),
    );
  });

  it("logs audit with oldValue and newValue", async () => {
    await updateAnimal(null, makeFormData(updateFormData));

    expect(mockLogAudit).toHaveBeenCalledWith(
      "update_animal",
      "animal",
      1,
      existingAnimal,
      expect.objectContaining({ name: "Rex Updated" }),
    );
  });

  it("sets updatedAt to current timestamp", async () => {
    await updateAnimal(null, makeFormData(updateFormData));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: expect.any(Date),
      }),
    );
  });

  it("returns error when animal not found", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const result = await updateAnimal(null, makeFormData(updateFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Dier niet gevonden");
    }
  });

  it("returns field error on duplicate name (unique constraint 23505)", async () => {
    mockUpdateReturning.mockRejectedValue(
      Object.assign(new Error("unique violation"), { code: "23505" }),
    );

    const result = await updateAnimal(null, makeFormData(updateFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.fieldErrors?.name).toBeDefined();
    }
  });

  it("returns graceful error on unexpected DB error", async () => {
    mockUpdateReturning.mockRejectedValue(new Error("Connection refused"));

    const result = await updateAnimal(null, makeFormData(updateFormData));

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBeDefined();
    }
  });

  it("saves aliasName (schuilnaam) when provided", async () => {
    await updateAnimal(null, makeFormData({
      ...updateFormData,
      aliasName: "Buddy",
    }));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        aliasName: "Buddy",
      }),
    );
  });

  // Story 10.39: description is NOT NULL in de DB. Een dier zonder beschrijving
  // (bv. een vondeling) mag bij bewerken GEEN null wegschrijven — dat gooide een
  // not-null-constraintfout ("Er ging iets mis bij het opslaan", Sven 2026-07-26).
  it("schrijft een lege beschrijving als lege string, niet als null (NOT NULL-kolom)", async () => {
    // updateFormData bevat geen description → mag NIET als null bewaard worden.
    await updateAnimal(null, makeFormData(updateFormData));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ description: "" }),
    );
  });

  it("revalidates the dieren path after update", async () => {
    await updateAnimal(null, makeFormData(updateFormData));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren");
  });

  // Story 10.23: voorkom stale UI op detail-pagina door óók die path te invalideren.
  it("revalidates the animal detail page after update", async () => {
    await updateAnimal(null, makeFormData({ ...updateFormData, id: "42" }));

    expect(mockRevalidatePath).toHaveBeenCalledWith("/beheerder/dieren/42");
  });

  // Story 10.23: sterilisatie/castratie — datum + door-asiel
  it("saves neuteredDate and neuteredByShelter when isNeutered is true", async () => {
    await updateAnimal(null, makeFormData({
      ...updateFormData,
      isNeutered: "true",
      neuteredDate: "2024-03-15",
      neuteredByShelter: "true",
    }));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: true,
        neuteredDate: "2024-03-15",
        neuteredByShelter: true,
      }),
    );
  });

  it("wist neuteredDate en neuteredByShelter wanneer isNeutered uitgevinkt wordt", async () => {
    // Sven-feedback 2026-05-12: bij heraanvinken mag de oude datum/bron NIET
    // weer verschijnen — uitvinken moet die velden actief wissen.
    await updateAnimal(null, makeFormData({
      ...updateFormData,
      isNeutered: "false",
    }));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: false,
        neuteredDate: null,
        neuteredByShelter: null,
      }),
    );
  });

  it("saves neuteredByShelter=false (al gedaan vóór intake) when explicitly set", async () => {
    await updateAnimal(null, makeFormData({
      ...updateFormData,
      isNeutered: "true",
      neuteredDate: "2023-08-01",
      neuteredByShelter: "false",
    }));

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: true,
        neuteredDate: "2023-08-01",
        neuteredByShelter: false,
      }),
    );
  });

  // Story 10.29: isNeutered is een radiogroep (één waarde), maar neuteredByShelter
  // blijft het hidden+checkbox-patroon — dat stuurt WEL twee entries voor dezelfde naam.
  it("BUG-REPRO: parses neuteredByShelter when form sends BOTH hidden 'false' AND checkbox 'true' (real browser behavior)", async () => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append("isNeutered", "true"); // radio: exact één waarde
    fd.append("neuteredDate", "2024-03-15");
    fd.append("neuteredByShelter", "false"); // hidden fallback
    fd.append("neuteredByShelter", "true"); // checkbox value when checked

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: true,
        neuteredDate: "2024-03-15",
        neuteredByShelter: true,
      }),
    );
  });

  // BUG-REPRO (2026-07-23): alle vinkjes in het bewerkformulier gebruiken het
  // hidden+checkbox-patroon, dus een echte browser stuurt TWEE entries met
  // dezelfde naam. `formData.get()` geeft dan altijd de eerste ("false") terug,
  // waardoor deze vinkjes nooit aan te zetten waren. Story 10.23 loste dit al op
  // voor isNeutered; deze vier bleven achter.
  it.each([
    ["isOnWebsite"],
    ["isFeatured"],
    ["isNewChip"],
    ["isNewPassport"],
  ])("persists %s=true when the browser sends hidden 'false' + checkbox 'true'", async (field) => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append(field, "false"); // hidden fallback first
    fd.append(field, "true"); // checkbox value when checked

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ [field]: true }),
    );
  });

  it.each([
    ["isOnWebsite"],
    ["isFeatured"],
    ["isNewChip"],
    ["isNewPassport"],
  ])("persists %s=false when only the hidden fallback is sent", async (field) => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append(field, "false");

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ [field]: false }),
    );
  });

  // Story 10.32: publicatiekanaal-vinkje voor de affiche. Enkel persistentie,
  // (nog) geen gedrag elders in de applicatie.
  it("saves isOnPoster when the checkbox is ticked", async () => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append("isOnPoster", "false"); // hidden fallback
    fd.append("isOnPoster", "true"); // checkbox

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isOnPoster: true }),
    );
  });

  it("saves isOnPoster=false when the checkbox is unticked", async () => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append("isOnPoster", "false"); // enkel de hidden fallback

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ isOnPoster: false }),
    );
  });

  // Story 10.32: website- en affichetekst staan los van de uitgebreide beschrijving.
  it("saves websiteDescription and posterDescription separately", async () => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append("description", "Werktekst");
    fd.append("websiteDescription", "Site-tekst");
    fd.append("posterDescription", "Affiche-tekst");

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Werktekst",
        websiteDescription: "Site-tekst",
        posterDescription: "Affiche-tekst",
      }),
    );
  });

  it("saves isNeutered=null and clears the detail fields when 'Onbekend' is selected", async () => {
    const fd = new FormData();
    fd.append("id", "1");
    fd.append("name", "Rex");
    fd.append("gender", "reu");
    fd.append("isNeutered", "onbekend");

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        isNeutered: null,
        neuteredDate: null,
        neuteredByShelter: null,
      }),
    );
  });

  // Story 10.36: IBN-velden bewerkbaar op de fiche.
  it("saves ibnReason, pvNr and melder-metadata when the IBN section is submitted", async () => {
    const fd = makeFormData({
      id: "1",
      name: "Rex",
      gender: "reu",
      intakeReason: "ibn",
      dossierNr: "DWV-1",
      pvNr: "PV-9",
      ibnReason: "Verwaarlozing",
      "intakeMetadata.melderNaam": "Politie Ninove",
      "intakeMetadata.betrokkenInstanties": "PZ Ninove",
    });

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierNr: "DWV-1",
        pvNr: "PV-9",
        ibnReason: "Verwaarlozing",
        intakeMetadata: expect.objectContaining({
          melderNaam: "Politie Ninove",
          betrokkenInstanties: "PZ Ninove",
        }),
      }),
    );
  });

  it("laat de IBN-kolommen ongemoeid wanneer hun sectie niet in het formulier stond", async () => {
    // updateFormData bevat geen dossierNr/pvNr/ibnReason/melder-velden.
    await updateAnimal(null, makeFormData(updateFormData));

    const setArg = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setArg).not.toHaveProperty("dossierNr");
    expect(setArg).not.toHaveProperty("pvNr");
    expect(setArg).not.toHaveProperty("ibnReason");
    expect(setArg).not.toHaveProperty("intakeMetadata");
  });

  it("wist een IBN-veld dat aanwezig maar leeg is", async () => {
    const fd = makeFormData({
      id: "1",
      name: "Rex",
      gender: "reu",
      intakeReason: "ibn",
      dossierNr: "",
      pvNr: "",
      ibnReason: "",
    });

    await updateAnimal(null, fd);

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        dossierNr: null,
        pvNr: null,
        ibnReason: null,
      }),
    );
  });
});
