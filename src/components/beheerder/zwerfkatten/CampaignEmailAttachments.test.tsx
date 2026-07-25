// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CampaignEmailAttachments from "./CampaignEmailAttachments";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

const attachments = [
  {
    id: 7,
    campaignId: 3,
    blobUrl: "https://blob.example/mail.eml",
    fileName: "vraag-gemeente.eml",
    fileSize: 2048,
    mimeType: "message/rfc822",
    uploadedBy: "sven@asiel.be",
    uploadedAt: new Date("2026-07-20T09:30:00Z"),
  },
];

const viewPayload = {
  subject: "Zwerfkatten Brusselsesteenweg",
  from: "Dienst Dierenwelzijn <info@ninove.be>",
  to: "asiel@ninove.be",
  cc: "",
  date: "2026-07-20T09:30:00.000Z",
  document: "<!doctype html><html><body><p>Beste,</p></body></html>",
  attachments: [{ index: 0, filename: "plan.pdf", mimeType: "application/pdf", size: 1024 }],
};

function mockFetchOk() {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => viewPayload,
  }) as unknown as typeof fetch;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderList(props: any = {}) {
  return render(<CampaignEmailAttachments campaignId={3} attachments={attachments as any} {...props} />);
}

describe("CampaignEmailAttachments — mail bekijken in de app (Story 10.41)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchOk();
  });

  it("opent de mail in een leesvenster i.p.v. te downloaden", async () => {
    renderList();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /vraag-gemeente\.eml/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledWith("/api/zwerfkatten/email/7/view");
    expect(await screen.findByText("Zwerfkatten Brusselsesteenweg")).toBeInTheDocument();
    expect(screen.getByText(/Dienst Dierenwelzijn/)).toBeInTheDocument();
  });

  it("toont de inhoud in een afgeschermd kader zonder scriptrechten", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /vraag-gemeente\.eml/i }));

    const frame = await screen.findByTitle(/inhoud van de mail/i);
    expect(frame).toHaveAttribute("srcdoc", expect.stringContaining("<p>Beste,</p>"));
    expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts");
  });

  it("somt de bijlagen van de mail op met een link om ze te openen", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /vraag-gemeente\.eml/i }));

    const link = await screen.findByRole("link", { name: /plan\.pdf/i });
    expect(link).toHaveAttribute("href", "/api/zwerfkatten/email/7/attachment/0");
  });

  it("toont een foutmelding wanneer de mail niet gelezen kan worden", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Deze mail kon niet gelezen worden." }),
    }) as unknown as typeof fetch;

    renderList();
    fireEvent.click(screen.getByRole("button", { name: /vraag-gemeente\.eml/i }));

    expect(await screen.findByText(/niet gelezen worden/i)).toBeInTheDocument();
  });

  it("sluit het leesvenster via de sluitknop", async () => {
    renderList();
    fireEvent.click(screen.getByRole("button", { name: /vraag-gemeente\.eml/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Sluiten"));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("behoudt een downloadmogelijkheid voor wie de mail in zijn mailprogramma wil openen", () => {
    renderList();

    const download = screen.getByRole("link", { name: /downloaden/i });
    expect(download).toHaveAttribute("href", "https://blob.example/mail.eml");
  });
});
