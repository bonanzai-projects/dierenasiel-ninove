// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AdoptionUpdateView } from "@/lib/queries/adoption-updates";

const h = vi.hoisted(() => ({
  mockCreate: vi.fn(), mockDelete: vi.fn(), mockDeleteFile: vi.fn(), mockRefresh: vi.fn(), mockPrepare: vi.fn(),
}));

vi.mock("@/lib/actions/adoption-updates", () => ({
  createAdoptionUpdate: h.mockCreate,
  deleteAdoptionUpdate: h.mockDelete,
  deleteAdoptionUpdateFile: h.mockDeleteFile,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: h.mockRefresh }) }));
vi.mock("@/lib/images/prepare-upload", () => ({ prepareForUpload: h.mockPrepare }));

import AdoptionUpdatesSection from "./AdoptionUpdatesSection";

// Story 10.74 — berichten en foto's na adoptie op de fiche (Sven).

const berichten: AdoptionUpdateView[] = [
  {
    id: 12, receivedOn: "2026-09-20", channel: "whatsapp", sender: "Sarah", message: "Bo slaapt al in de zetel 😄",
    createdByName: "Sven", createdAt: "2026-09-21T08:00:00.000Z",
    files: [
      { id: 40, fileName: "bo.jpg", mimeType: "image/jpeg", fileSize: 1000, kind: "foto" },
      { id: 41, fileName: "Nieuws van Bo.eml", mimeType: "message/rfc822", fileSize: 2000, kind: "mail" },
      { id: 42, fileName: "dierenarts.pdf", mimeType: "application/pdf", fileSize: 3000, kind: "pdf" },
    ],
  },
];

function toon(props: Partial<Parameters<typeof AdoptionUpdatesSection>[0]> = {}) {
  render(<AdoptionUpdatesSection animalId={315} canWrite updates={berichten} today="2026-09-27" {...props} />);
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  h.mockPrepare.mockImplementation(async (f: File) => f);
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AdoptionUpdatesSection — lijst", () => {
  it("toont datum, kanaal, afzender, wie het bewaarde en de tekst", () => {
    toon();
    // Het eerste lijstitem is het bericht; zijn bijlagen staan in een geneste lijst.
    const bericht = within(screen.getByRole("list", { name: "Berichten na adoptie" })).getAllByRole("listitem")[0];
    expect(bericht).toHaveTextContent("20/09/2026");
    expect(bericht).toHaveTextContent("WhatsApp");
    expect(bericht).toHaveTextContent("van Sarah");
    expect(bericht).toHaveTextContent("bewaard door Sven");
    expect(bericht).toHaveTextContent("Bo slaapt al in de zetel 😄");
  });

  it("toont foto's via de beveiligde route, nooit een opslaglink", () => {
    toon();
    const img = screen.getByRole("img", { name: "bo.jpg" });
    expect(img).toHaveAttribute("src", "/api/adoptie/berichten/bestand/40");
    expect(img.closest("a")).toHaveAttribute("href", "/api/adoptie/berichten/bestand/40");
  });

  it("opent een mail in het programma", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      subject: "Nieuws van Bo", from: "Sarah", to: "", cc: "", date: null, document: "<p>Hallo</p>", attachments: [],
    }), { status: 200 }));
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Mail lezen: Nieuws van Bo.eml" }));
    const venster = await screen.findByRole("dialog", { name: "Mail: Nieuws van Bo.eml" });
    expect(fetchMock).toHaveBeenCalledWith("/api/adoptie/berichten/bestand/41/mail");
    await waitFor(() => expect(venster.querySelector("iframe")).toHaveAttribute("srcdoc", "<p>Hallo</p>"));
  });

  it("opent een PDF in het venster van het programma", () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "PDF openen: dierenarts.pdf" }));
    const venster = screen.getByRole("dialog", { name: "dierenarts.pdf" });
    expect(venster.querySelector("iframe")).toHaveAttribute("src", "/api/adoptie/berichten/bestand/42");
  });

  it("toont een uitleg als er nog niets is", () => {
    toon({ updates: [] });
    expect(screen.getByText(/Nog geen berichten/)).toBeInTheDocument();
  });

  it("biedt geen toevoegen of verwijderen aan wie enkel mag kijken", () => {
    toon({ canWrite: false });
    expect(screen.queryByRole("button", { name: "Bericht toevoegen" })).toBeNull();
    expect(screen.queryByRole("button", { name: /verwijderen/i })).toBeNull();
  });
});

describe("AdoptionUpdatesSection — toevoegen", () => {
  function vulIn() {
    fireEvent.click(screen.getByRole("button", { name: "Bericht toevoegen" }));
    fireEvent.change(screen.getByLabelText("Kanaal"), { target: { value: "mail" } });
    fireEvent.change(screen.getByLabelText("Van (optioneel)"), { target: { value: "Sarah" } });
    fireEvent.change(screen.getByLabelText("Bericht"), { target: { value: "Alles goed!" } });
    const foto = new File([new Uint8Array(10)], "bo.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByLabelText("Foto's, mails (.eml) of PDF"), { target: { files: [foto] } });
    return foto;
  }

  it("bewaart het bericht, laadt de verkleinde foto op en ververst", async () => {
    h.mockCreate.mockResolvedValue({ success: true, data: { id: 13 } });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 50, fileName: "bo.jpg", kind: "foto" }), { status: 200 }));
    toon();
    const foto = vulIn();
    expect(screen.getByLabelText("Datum")).toHaveValue("2026-09-27");
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));

    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Bericht bewaard."));
    expect(h.mockPrepare).toHaveBeenCalledWith(foto);
    expect(h.mockCreate).toHaveBeenCalledWith({
      animalId: 315, receivedOn: "2026-09-27", channel: "mail", sender: "Sarah", message: "Alles goed!", fileCount: 1,
    });
    const [url, opties] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/adoptie/berichten/upload");
    expect((opties.body as FormData).get("updateId")).toBe("13");
    expect((opties.body as FormData).get("file")).toBe(foto);
    expect(h.mockRefresh).toHaveBeenCalled();
    expect(screen.queryByLabelText("Bericht")).toBeNull();
  });

  it("meldt welk bestand niet opgeladen kon worden", async () => {
    h.mockCreate.mockResolvedValue({ success: true, data: { id: 13 } });
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: '"bo.jpg" is te groot (max. 4 MB).' }), { status: 400 }));
    toon();
    vulIn();
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent('"bo.jpg" is te groot (max. 4 MB).'));
    expect(h.mockRefresh).toHaveBeenCalled();
  });

  it("toont de fout van het bewaren en laadt dan niets op", async () => {
    h.mockCreate.mockResolvedValue({ success: false, error: "De datum kan niet in de toekomst liggen." });
    toon();
    vulIn();
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("De datum kan niet in de toekomst liggen."));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Bericht")).toHaveValue("Alles goed!");
  });

  it("slaat een foto over die de browser niet kan lezen, en zegt waarom", async () => {
    h.mockPrepare.mockRejectedValue(new Error('"IMG_1.heic" kan deze browser niet openen. Sla de foto op als JPG en probeer opnieuw.'));
    h.mockCreate.mockResolvedValue({ success: true, data: { id: 13 } });
    toon();
    vulIn();
    fireEvent.click(screen.getByRole("button", { name: "Bewaren" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("kan deze browser niet openen"));
    expect(h.mockCreate).toHaveBeenCalledWith(expect.objectContaining({ fileCount: 0 }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("weigert een bestandstype dat niet mag, vóór er iets bewaard wordt", async () => {
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Bericht toevoegen" }));
    fireEvent.change(screen.getByLabelText("Bericht"), { target: { value: "Film" } });
    fireEvent.change(screen.getByLabelText("Foto's, mails (.eml) of PDF"), {
      target: { files: [new File(["x"], "film.mp4", { type: "video/mp4" })] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent('"film.mp4": enkel foto\'s (JPG, PNG, WebP), doorgestuurde mails (.eml) of PDF.');
    expect(screen.queryByText("film.mp4", { selector: "li *" })).toBeNull();
  });
});

describe("AdoptionUpdatesSection — verwijderen", () => {
  it("verwijdert een bericht na bevestiging", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    h.mockDelete.mockResolvedValue({ success: true, data: undefined });
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Bericht verwijderen" }));
    await waitFor(() => expect(h.mockDelete).toHaveBeenCalledWith(12));
    expect(h.mockRefresh).toHaveBeenCalled();
  });

  it("doet niets zonder bevestiging", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Bericht verwijderen" }));
    expect(h.mockDelete).not.toHaveBeenCalled();
  });

  it("verwijdert één bestand", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    h.mockDeleteFile.mockResolvedValue({ success: true, data: undefined });
    toon();
    fireEvent.click(screen.getByRole("button", { name: "Bestand verwijderen: bo.jpg" }));
    await waitFor(() => expect(h.mockDeleteFile).toHaveBeenCalledWith(40));
  });
});
