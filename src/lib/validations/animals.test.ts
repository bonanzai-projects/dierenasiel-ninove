import { describe, it, expect } from "vitest";
import { animalIntakeSchema, animalUpdateSchema, SHORT_DESCRIPTION_MAX } from "./animals";

const validIntake = {
  name: "Rex",
  species: "hond" as const,
  gender: "reu",
  intakeDate: "2026-02-26",
};

describe("animalIntakeSchema", () => {
  it("accepts a valid intake form with required fields only", () => {
    const result = animalIntakeSchema.safeParse(validIntake);
    expect(result.success).toBe(true);
  });

  it("accepts a complete intake form with all optional fields", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      breed: "Mechelse Herder",
      color: "bruin",
      dateOfBirth: "2022-05-02",
      identificationNr: "981100004567890",
      passportNr: "BE-123456",
      intakeDate: "2026-02-26",
      intakeReason: "afstand",
      description: "Een lieve hond",
      shortDescription: "Lief",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when naam is missing", () => {
    const result = animalIntakeSchema.safeParse({ species: "hond", gender: "reu" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
    }
  });

  it("rejects when naam is empty string", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects when soort is missing", () => {
    const result = animalIntakeSchema.safeParse({ name: "Rex", gender: "reu" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.species).toBeDefined();
    }
  });

  it("rejects an invalid soort value", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, species: "vis" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.species).toBeDefined();
    }
  });

  it("rejects when geslacht is missing", () => {
    const result = animalIntakeSchema.safeParse({ name: "Rex", species: "hond" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.gender).toBeDefined();
    }
  });

  it("rejects when geslacht is empty string", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, gender: "" });
    expect(result.success).toBe(false);
  });

  it("allows all optional fields to be omitted", () => {
    const result = animalIntakeSchema.safeParse(validIntake);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.breed).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.isPickedUpByShelter).toBe(false);
    }
  });

  // Story 10.30: "tijdelijke_opvang" toegevoegd naast de 3 originele redenen.
  it("accepts 'tijdelijke_opvang' without requiring the IBN-only fields", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "tijdelijke_opvang",
    });
    expect(result.success).toBe(true);
  });

  it("accepts 'tijdelijke_opvang' on the update schema too", () => {
    const result = animalUpdateSchema.safeParse({
      id: 1,
      name: "Rex",
      gender: "reu",
      intakeReason: "tijdelijke_opvang",
    });
    expect(result.success).toBe(true);
  });

  it("accepts the 3 valid intake reasons (Story 10.21: afstand, ibn, zwerfhond)", () => {
    for (const reason of ["afstand", "zwerfhond"]) {
      const result = animalIntakeSchema.safeParse({ ...validIntake, intakeReason: reason });
      expect(result.success).toBe(true);
    }
    // IBN requires extra fields
    const ibnResult = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
      pvNr: "PV-2026-001",
    });
    expect(ibnResult.success).toBe(true);
  });

  it("rejects legacy intake reasons 'vondeling' and 'overig' (Story 10.21 snoeien)", () => {
    for (const reason of ["vondeling", "overig"]) {
      const result = animalIntakeSchema.safeParse({ ...validIntake, intakeReason: reason });
      expect(result.success).toBe(false);
    }
  });

  it("rejects an invalid intake reason", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, intakeReason: "ongeldig" });
    expect(result.success).toBe(false);
  });

  it("accepts intake_metadata for shelter pickup", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      isPickedUpByShelter: true,
      intakeMetadata: {
        melderNaam: "Jan Janssens",
        melderLocatie: "Brusselsesteenweg 123, Ninove",
        melderDatum: "2026-02-25",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intakeMetadata?.melderNaam).toBe("Jan Janssens");
    }
  });

  it("rejects when intakeDate is missing", () => {
    const { intakeDate: _, ...withoutDate } = validIntake;
    const result = animalIntakeSchema.safeParse(withoutDate);
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.intakeDate).toBeDefined();
    }
  });

  it("rejects when intakeDate is empty string", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, intakeDate: "" });
    expect(result.success).toBe(false);
  });

  it("accepts empty intake_metadata", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      isPickedUpByShelter: false,
    });
    expect(result.success).toBe(true);
  });

  // IBN-validatie — Sven-feedback 2026-07-24: het asiel krijgt het dossier- en
  // PV-nummer pas later, dus deze velden mogen de registratie NIET blokkeren.
  it("aanvaardt IBN-intake zónder dossiernummer (komt later)", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      pvNr: "PV-2026-001",
    });
    expect(result.success).toBe(true);
  });

  it("aanvaardt IBN-intake zónder PV-nummer (komt later)", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
    });
    expect(result.success).toBe(true);
  });

  it("aanvaardt IBN-intake met geen van beide nummers ingevuld", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid IBN intake with all required fields", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
      pvNr: "PV-2026-001",
    });
    expect(result.success).toBe(true);
  });

  it("does not require dossierNr/pvNr for non-IBN intake", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "afstand",
    });
    expect(result.success).toBe(true);
  });

  it("does not require dossierNr/pvNr when intakeReason is omitted", () => {
    const result = animalIntakeSchema.safeParse(validIntake);
    expect(result.success).toBe(true);
  });

  it("accepts IBN intake with betrokken instanties metadata", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      dossierNr: "DWV-2026-12345",
      pvNr: "PV-2026-001",
      isPickedUpByShelter: true,
      intakeMetadata: {
        melderNaam: "Politie Ninove",
        melderLocatie: "Centrumlaan 100",
        melderDatum: "2026-02-20",
        betrokkenInstanties: "Politiezone Ninove, Dierenwelzijn Vlaanderen",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.intakeMetadata?.betrokkenInstanties).toBe(
        "Politiezone Ninove, Dierenwelzijn Vlaanderen",
      );
    }
  });

  it("aanvaardt IBN-intake met lege dossier-/PV-nummers (worden later ingevuld)", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      intakeReason: "ibn",
      dossierNr: "",
      pvNr: "",
    });
    expect(result.success).toBe(true);
  });

  // Story 10.23: sterilisatie/castratie — datum + door-asiel
  // Story 10.29: zonder keuze is de status onbekend (null), niet "Nee".
  it("accepts intake without isNeutered/neuteredDate/neuteredByShelter", () => {
    const result = animalIntakeSchema.safeParse(validIntake);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNeutered).toBe(null);
      expect(result.data.neuteredDate).toBeUndefined();
      expect(result.data.neuteredByShelter).toBeUndefined();
    }
  });

  it("accepts an explicit null for isNeutered (onbekend)", () => {
    const result = animalIntakeSchema.safeParse({ ...validIntake, isNeutered: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNeutered).toBe(null);
    }
  });

  it("accepts intake with isNeutered=true and full sterilisatie details", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      isNeutered: true,
      neuteredDate: "2024-03-15",
      neuteredByShelter: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isNeutered).toBe(true);
      expect(result.data.neuteredDate).toBe("2024-03-15");
      expect(result.data.neuteredByShelter).toBe(true);
    }
  });

  it("accepts intake with isNeutered=true but no datum/bron (Story 10.23)", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      isNeutered: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts neuteredByShelter=false (al gedaan vóór intake)", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      isNeutered: true,
      neuteredByShelter: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neuteredByShelter).toBe(false);
    }
  });
});

const validUpdate = {
  id: 1,
  name: "Rex",
  gender: "reu",
};

describe("animalUpdateSchema", () => {
  it("accepts a valid update with all fields", () => {
    const result = animalUpdateSchema.safeParse({
      id: 1,
      name: "Rex",
      gender: "reu",
      aliasName: "Buddy",
      breed: "Mechelse Herder",
      color: "bruin",
      dateOfBirth: "2022-05-02",
      description: "Een lieve hond",
      shortDescription: "Lief",
      identificationNr: "981100004567890",
      passportNr: "BE-123456",
      barcode: "ABC123",
      isOnWebsite: true,
      isFeatured: false,
    });
    expect(result.success).toBe(true);
  });

  it("accepts update with only required fields (id, name)", () => {
    const result = animalUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("rejects when id is missing", () => {
    const result = animalUpdateSchema.safeParse({ name: "Rex" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.id).toBeDefined();
    }
  });

  it("rejects when name is empty", () => {
    const result = animalUpdateSchema.safeParse({ id: 1, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.flatten().fieldErrors;
      expect(fields.name).toBeDefined();
    }
  });

  it("coerces string id to number", () => {
    const result = animalUpdateSchema.safeParse({ id: "5", name: "Rex", gender: "reu" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(5);
    }
  });

  // Story 10.36: IBN-velden ook bewerkbaar op de fiche.
  it("accepts pvNr, ibnReason en intakeMetadata op de fiche", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      intakeReason: "ibn",
      dossierNr: "DWV-1",
      pvNr: "PV-9",
      ibnReason: "Verwaarlozing",
      intakeMetadata: {
        melderNaam: "Politie Ninove",
        betrokkenInstanties: "PZ Ninove",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ibnReason).toBe("Verwaarlozing");
      expect(result.data.pvNr).toBe("PV-9");
      expect(result.data.intakeMetadata?.melderNaam).toBe("Politie Ninove");
    }
  });

  it("accepts boolean toggles isOnWebsite and isFeatured", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      isOnWebsite: true,
      isFeatured: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOnWebsite).toBe(true);
      expect(result.data.isFeatured).toBe(true);
    }
  });

  it("defaults isOnWebsite and isFeatured to false when omitted", () => {
    const result = animalUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isOnWebsite).toBe(false);
      expect(result.data.isFeatured).toBe(false);
    }
  });

  it("accepts optional aliasName (schuilnaam)", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      aliasName: "Buddy",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.aliasName).toBe("Buddy");
    }
  });

  it("accepts all optional fields as undefined", () => {
    const result = animalUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.breed).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.aliasName).toBeUndefined();
      expect(result.data.description).toBeUndefined();
    }
  });

  it("accepts the 3 valid intake reasons + empty string (Story 10.21)", () => {
    for (const reason of ["afstand", "ibn", "zwerfhond", ""]) {
      const result = animalUpdateSchema.safeParse({ ...validUpdate, intakeReason: reason });
      expect(result.success).toBe(true);
    }
  });

  it("rejects legacy intake reasons 'vondeling' and 'overig' in update (Story 10.21 snoeien)", () => {
    for (const reason of ["vondeling", "overig"]) {
      const result = animalUpdateSchema.safeParse({ ...validUpdate, intakeReason: reason });
      expect(result.success).toBe(false);
    }
  });

  // Story 10.23: sterilisatie/castratie — datum + door-asiel in update-schema
  it("accepts update with neuteredDate + neuteredByShelter (Story 10.23)", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      isNeutered: true,
      neuteredDate: "2024-03-15",
      neuteredByShelter: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neuteredDate).toBe("2024-03-15");
      expect(result.data.neuteredByShelter).toBe(true);
    }
  });

  it("accepts empty neuteredDate as literal '' in update (Story 10.23)", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      neuteredDate: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts update without sterilisatie velden (defaults blijven)", () => {
    const result = animalUpdateSchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neuteredDate).toBeUndefined();
      expect(result.data.neuteredByShelter).toBeUndefined();
    }
  });

  it("accepts neuteredByShelter=false in update", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      isNeutered: true,
      neuteredByShelter: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.neuteredByShelter).toBe(false);
    }
  });
});

// Story 10.32: de UI-limiet op de korte beschrijving moet de DB-restrictie
// (varchar 300) spiegelen — zodat een te lange tekst een nette fout geeft in
// plaats van een databasecrash, en de lange velden net géén limiet krijgen.
describe("beschrijving-limieten spiegelen de database", () => {
  it("SHORT_DESCRIPTION_MAX is 300 (= varchar-lengte in het schema)", () => {
    expect(SHORT_DESCRIPTION_MAX).toBe(300);
  });

  it("aanvaardt een korte beschrijving tot exact 300 tekens", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      shortDescription: "x".repeat(SHORT_DESCRIPTION_MAX),
    });
    expect(result.success).toBe(true);
  });

  it("weigert een korte beschrijving van meer dan 300 tekens", () => {
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      shortDescription: "x".repeat(SHORT_DESCRIPTION_MAX + 1),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.shortDescription).toBeDefined();
    }
  });

  it("weigert ook bij intake een te lange korte beschrijving", () => {
    const result = animalIntakeSchema.safeParse({
      ...validIntake,
      shortDescription: "x".repeat(SHORT_DESCRIPTION_MAX + 1),
    });
    expect(result.success).toBe(false);
  });

  it("legt géén lengtelimiet op aan de lange tekstvelden (DB = text)", () => {
    const heelLang = "y".repeat(10_000);
    const result = animalUpdateSchema.safeParse({
      ...validUpdate,
      description: heelLang,
      websiteDescription: heelLang,
      posterDescription: heelLang,
    });
    expect(result.success).toBe(true);
  });
});
