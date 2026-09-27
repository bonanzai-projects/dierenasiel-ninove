// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockEmail, mockRefresh } = vi.hoisted(() => ({ mockEmail: vi.fn(), mockRefresh: vi.fn() }));

vi.mock("@/lib/actions/ibn-dossier", () => ({ emailIbnDossier: mockEmail }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

import IbnDossierActions from "./IbnDossierActions";

// Story 10.72 — op de fiche: het IBN-dossier bekijken en mailen naar politie of Dierenwelzijn.

function toon(props: Partial<Parameters<typeof IbnDossierActions>[0]> = {}) {
  render(<IbnDossierActions animalId={315} animalName="Bo" canMail mailings={[]} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockEmail.mockReset();
});

describe("IbnDossierActions", () => {
  it("opent het dossier in het programma", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "IBN-dossier bekijken" }));
    const venster = screen.getByRole("dialog", { name: "IBN-dossier Bo" });
    expect(venster.querySelector("iframe")?.getAttribute("src")).toBe("/api/dieren/315/ibn-dossier/pdf");
  });

  it("toont het mailformulier pas na een klik", () => {
    toon();
    expect(screen.queryByLabelText("Naar")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "IBN-dossier mailen…" }));
    expect(screen.getByLabelText("Naar")).toBeInTheDocument();
    expect(screen.getByLabelText("Bericht (optioneel)")).toBeInTheDocument();
  });

  it("biedt geen mailknop aan wie niet mag schrijven", () => {
    toon({ canMail: false });
    expect(screen.getByRole("button", { name: "IBN-dossier bekijken" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "IBN-dossier mailen…" })).toBeNull();
  });

  it("verstuurt naar de ingevulde adressen en meldt het resultaat", async () => {
    mockEmail.mockResolvedValue({ success: true, data: undefined, message: "Het IBN-dossier is gemaild naar wijk@politie.be." });
    toon();
    fireEvent.click(screen.getByRole("button", { name: "IBN-dossier mailen…" }));
    fireEvent.change(screen.getByLabelText("Naar"), { target: { value: "wijk@politie.be" } });
    fireEvent.change(screen.getByLabelText("Bericht (optioneel)"), { target: { value: "Graag bevestiging." } });
    fireEvent.click(screen.getByRole("button", { name: "Versturen" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Het IBN-dossier is gemaild naar wijk@politie.be."));
    expect(mockEmail).toHaveBeenCalledWith(315, { recipients: "wijk@politie.be", message: "Graag bevestiging." });
    expect(mockRefresh).toHaveBeenCalled();
    expect(screen.queryByLabelText("Naar")).toBeNull();
  });

  it("toont een fout en laat de ingevulde gegevens staan", async () => {
    mockEmail.mockResolvedValue({ success: false, error: '"politie" is geen geldig e-mailadres.' });
    toon();
    fireEvent.click(screen.getByRole("button", { name: "IBN-dossier mailen…" }));
    fireEvent.change(screen.getByLabelText("Naar"), { target: { value: "politie" } });
    fireEvent.click(screen.getByRole("button", { name: "Versturen" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent('"politie" is geen geldig e-mailadres.'));
    expect(screen.getByLabelText("Naar")).toHaveValue("politie");
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("toont wanneer het dossier al naar wie gemaild werd, in Belgische tijd", () => {
    toon({
      mailings: [{ sentAt: "2026-09-25T12:00:00.000Z", to: ["wijk@politie.be", "dwv@vlaanderen.be"], by: "Sven" }],
    });
    const lijst = screen.getByRole("list", { name: "Eerder verstuurd" });
    expect(lijst).toHaveTextContent("25/09/2026 14:00");
    expect(lijst).toHaveTextContent("wijk@politie.be, dwv@vlaanderen.be");
    expect(lijst).toHaveTextContent("door Sven");
  });

  it("toont geen lijst als het dossier nog nooit gemaild werd", () => {
    toon();
    expect(screen.queryByRole("list", { name: "Eerder verstuurd" })).toBeNull();
  });
});
