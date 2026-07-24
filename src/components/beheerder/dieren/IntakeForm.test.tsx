// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import IntakeForm from "./IntakeForm";

vi.mock("@/lib/actions/animals", () => ({
  createAnimalIntake: vi.fn(),
}));

// jsdom implementeert scrollIntoView niet; de "scroll naar eerste fout"-effect
// van het formulier roept die aan zodra er een fout is → stubben.
beforeAll(() => {
  HTMLElement.prototype.scrollIntoView = vi.fn();
});

function getReasonSelect(): HTMLSelectElement {
  return screen.getByLabelText("Reden binnenkomst") as HTMLSelectElement;
}

describe("IntakeForm — intake reason dropdown (Story 10.21)", () => {
  // Story 10.30: "Tijdelijke opvang" toegevoegd als vierde reden.
  it("toont exact 4 opties (+ placeholder) met de juiste labels", () => {
    render(<IntakeForm />);
    const select = getReasonSelect();
    const optionValues = Array.from(select.options).map((o) => o.value);
    const optionLabels = Array.from(select.options).map((o) => o.text);

    expect(optionValues).toEqual(["", "afstand", "ibn", "zwerfhond", "tijdelijke_opvang"]);
    expect(optionLabels).toEqual([
      "Selecteer reden...",
      "Afstand door eigenaar",
      "Inbeslagname (IBN)",
      "Vondeling",
      "Tijdelijke opvang",
    ]);
  });

  it("bevat geen legacy waarden 'vondeling' of 'overig' meer", () => {
    render(<IntakeForm />);
    const select = getReasonSelect();
    const values = Array.from(select.options).map((o) => o.value);

    expect(values).not.toContain("vondeling");
    expect(values).not.toContain("overig");
  });

  it("toont de IBN-conditional sectie (dossierNr + pvNr) wanneer 'ibn' geselecteerd is", () => {
    render(<IntakeForm />);
    const select = getReasonSelect();

    // Standaard: IBN-sectie niet zichtbaar
    expect(screen.queryByLabelText(/Dossiernummer/i)).toBeNull();

    fireEvent.change(select, { target: { value: "ibn" } });

    // Na keuze: dossierNr + pvNr + reden van inbeslagname verschijnen
    expect(screen.getByLabelText(/Dossiernummer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/PV-nummer/i)).toBeInTheDocument();
    // Story 10.36: vrij tekstveld "Reden van inbeslagname".
    expect(screen.getByLabelText(/Reden van inbeslagname/i)).toBeInTheDocument();
  });

  it("toont GEEN IBN-conditional sectie wanneer 'afstand' geselecteerd is", () => {
    render(<IntakeForm />);
    const select = getReasonSelect();
    fireEvent.change(select, { target: { value: "afstand" } });

    expect(screen.queryByLabelText(/Dossiernummer/i)).toBeNull();
    expect(screen.queryByLabelText(/PV-nummer/i)).toBeNull();
  });
});

// Sven-feedback 2026-07-24: bij een vondeling moeten adres + naam melder/brenger
// ingevuld kunnen worden, ook als iemand het dier komt brengen (geen ophaling).
describe("IntakeForm — melder-velden bij een vondeling (Story 10.35)", () => {
  it("toont de melder-velden zodra 'Vondeling' gekozen is, zonder ophaal-vinkje", () => {
    render(<IntakeForm />);
    const select = getReasonSelect();

    // Standaard niet zichtbaar
    expect(screen.queryByLabelText(/Naam melder/i)).toBeNull();
    expect(screen.queryByLabelText(/Adres \/ vindplaats/i)).toBeNull();

    fireEvent.change(select, { target: { value: "zwerfhond" } });

    // Nu zichtbaar zonder dat "opgehaald door het asiel" aangevinkt is
    expect(
      (screen.getByRole("checkbox", { name: /Opgehaald door het asiel/i }) as HTMLInputElement).checked,
    ).toBe(false);
    expect(screen.getByLabelText(/Naam melder/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Adres \/ vindplaats/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Datum melding/i)).toBeInTheDocument();
  });

  it("toont GEEN 'betrokken instanties' bij een vondeling (dat is IBN-only)", () => {
    render(<IntakeForm />);
    fireEvent.change(getReasonSelect(), { target: { value: "zwerfhond" } });
    expect(screen.queryByLabelText(/Betrokken instanties/i)).toBeNull();
  });

  it("toont de melder-velden niet bij 'afstand' zonder ophaling", () => {
    render(<IntakeForm />);
    fireEvent.change(getReasonSelect(), { target: { value: "afstand" } });
    expect(screen.queryByLabelText(/Naam melder/i)).toBeNull();
    expect(screen.queryByLabelText(/Adres \/ vindplaats/i)).toBeNull();
  });
});

describe("IntakeForm — sterilisatie detail (Story 10.23)", () => {
  // Story 10.29: checkbox vervangen door radiogroep Ja / Nee / Onbekend.
  function getNeuteredRadio(label: "Ja" | "Nee" | "Onbekend"): HTMLInputElement {
    return screen.getByRole("radio", { name: label }) as HTMLInputElement;
  }

  it("start standaard op 'Onbekend'", () => {
    render(<IntakeForm />);
    expect(getNeuteredRadio("Onbekend").checked).toBe(true);
    expect(getNeuteredRadio("Ja").checked).toBe(false);
    expect(getNeuteredRadio("Nee").checked).toBe(false);
  });

  it("toont GEEN datum/bron-velden standaard", () => {
    render(<IntakeForm />);
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();
    expect(screen.queryByLabelText(/Door het asiel uitgevoerd/i)).toBeNull();
  });

  it("toont datum + bron-velden zodra 'Ja' wordt geselecteerd", () => {
    render(<IntakeForm />);
    fireEvent.click(getNeuteredRadio("Ja"));
    expect(screen.getByLabelText(/Datum sterilisatie/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Door het asiel uitgevoerd/i)).toBeInTheDocument();
  });

  it("verbergt de velden weer bij 'Nee' en bij 'Onbekend'", () => {
    render(<IntakeForm />);
    fireEvent.click(getNeuteredRadio("Ja"));
    expect(screen.getByLabelText(/Datum sterilisatie/i)).toBeInTheDocument();

    fireEvent.click(getNeuteredRadio("Nee"));
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();

    fireEvent.click(getNeuteredRadio("Ja"));
    fireEvent.click(getNeuteredRadio("Onbekend"));
    expect(screen.queryByLabelText(/Datum sterilisatie/i)).toBeNull();
  });
});

// Sven-feedback 2026-07-24: bij een validatiefout mochten de reeds ingevulde
// velden niet leeglopen.
describe("IntakeForm — behoud van invoer bij een validatiefout (Story 10.34)", () => {
  it("toont de door de action teruggegeven waarden opnieuw als defaultValue", async () => {
    const { createAnimalIntake } = await import("@/lib/actions/animals");
    (createAnimalIntake as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      fieldErrors: { name: ["Naam is verplicht"] },
      values: {
        breed: "Border Collie",
        color: "Merle bruin",
        identificationNr: "981100002787934",
      },
    });

    render(<IntakeForm />);
    fireEvent.click(screen.getByRole("button", { name: /Registreren/i }));

    // Na de (mislukte) action tonen de velden hun eerder ingevoerde waarde weer.
    expect(await screen.findByDisplayValue("Border Collie")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Merle bruin")).toBeInTheDocument();
    expect(screen.getByDisplayValue("981100002787934")).toBeInTheDocument();
  });

  it("laat velden leeg wanneer er (nog) geen fout is teruggegeven", () => {
    render(<IntakeForm />);
    expect(screen.getByLabelText(/Ras/i)).toHaveValue("");
  });
});
