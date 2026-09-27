// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const h = vi.hoisted(() => ({ mockCreate: vi.fn(), mockPush: vi.fn() }));
vi.mock("@/lib/actions/vet-inspection-reports", () => ({ createVetInspectionReport: h.mockCreate }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: h.mockPush, refresh: vi.fn() }) }));

import InspectionReportForm from "./InspectionReportForm";

// Story 10.81 — de dierenarts kiezen uit de dierenartsenlijst.

const vets = [
  { id: 3, name: "Dr. Ine Wouters", practice: "Dierenkliniek De Dender" },
  { id: 4, name: "Dr. Peeters", practice: null },
];

function toon(props: Partial<{ vets: typeof vets; defaultVetName: string }> = {}) {
  return render(
    <InspectionReportForm shelterAnimals={[]} diagnoses={[]} vets={props.vets ?? vets} defaultVetName={props.defaultVetName ?? ""} />,
  );
}

function verzondenPayload() {
  const fd = h.mockCreate.mock.calls[0][1] as FormData;
  return JSON.parse(fd.get("json") as string);
}

beforeEach(() => {
  h.mockCreate.mockReset();
  h.mockCreate.mockResolvedValue({ success: true, data: { id: 12 } });
});

describe("InspectionReportForm — dierenarts (Story 10.81)", () => {
  it("laat de dierenarts kiezen uit de lijst, met 'Andere' als uitweg", () => {
    toon();
    const keuze = screen.getByLabelText(/^Dierenarts/);
    const opties = Array.from((keuze as HTMLSelectElement).options).map((o) => o.text);
    expect(opties).toEqual(["Dr. Ine Wouters — Dierenkliniek De Dender", "Dr. Peeters", "Andere (niet in de lijst)"]);
  });

  it("kiest de dierenarts met de naam van wie ingelogd is", () => {
    toon({ defaultVetName: "dr. peeters " });
    expect(screen.getByLabelText(/^Dierenarts/)).toHaveValue("4");
    expect(screen.queryByLabelText(/^Naam dierenarts/)).toBeNull();
  });

  it("staat op 'Andere' met de getypte naam als wie ingelogd is niet in de lijst staat", () => {
    toon({ defaultVetName: "Nadia" });
    expect(screen.getByLabelText(/^Dierenarts/)).toHaveValue("andere");
    expect(screen.getByLabelText(/^Naam dierenarts/)).toHaveValue("Nadia");
  });

  it("stuurt de gekozen dierenarts mee", async () => {
    toon({ defaultVetName: "Nadia" });
    fireEvent.change(screen.getByLabelText(/^Dierenarts/), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Rapport opslaan" }));
    await waitFor(() => expect(h.mockCreate).toHaveBeenCalled());
    expect(verzondenPayload()).toMatchObject({ veterinarianId: 3, vetName: "Dr. Ine Wouters" });
  });

  it("stuurt bij 'Andere' enkel de getypte naam mee", async () => {
    toon({ defaultVetName: "Dr. Peeters" });
    fireEvent.change(screen.getByLabelText(/^Dierenarts/), { target: { value: "andere" } });
    fireEvent.change(screen.getByLabelText(/^Naam dierenarts/), { target: { value: "Dr. Claes" } });
    fireEvent.click(screen.getByRole("button", { name: "Rapport opslaan" }));
    await waitFor(() => expect(h.mockCreate).toHaveBeenCalled());
    expect(verzondenPayload()).toMatchObject({ veterinarianId: null, vetName: "Dr. Claes" });
  });

  it("toont bij een lege lijst het naamveld en de weg naar de lijst", () => {
    toon({ vets: [], defaultVetName: "Nadia" });
    expect(screen.queryByLabelText(/^Dierenarts/)).toBeNull();
    expect(screen.getByLabelText(/^Naam dierenarts/)).toHaveValue("Nadia");
    expect(screen.getByRole("link", { name: /dierenartsenlijst/ })).toHaveAttribute("href", "/beheerder/medisch/dierenartsen");
  });
});
