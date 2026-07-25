import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetSession, mockHasPermission, mockSelectLimit, mockSelect, mockParse } = vi.hoisted(() => {
  const mockSelectLimit = vi.fn();
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockSelectLimit }) }),
  });
  return {
    mockGetSession: vi.fn(),
    mockHasPermission: vi.fn(),
    mockSelectLimit,
    mockSelect,
    mockParse: vi.fn(),
  };
});

vi.mock("@/lib/auth/session", () => ({ getSession: mockGetSession }));
vi.mock("@/lib/permissions", () => ({ hasPermission: mockHasPermission }));
vi.mock("@/lib/db", () => ({ db: { select: mockSelect } }));
vi.mock("@/lib/db/schema", () => ({
  strayCatCampaignAttachments: { id: Symbol("attachments.id") },
}));
vi.mock("drizzle-orm", () => ({ eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })) }));
vi.mock("postal-mime", () => ({
  default: class {
    parse = mockParse;
  },
}));

import { GET } from "./route";

function createParams(id: string | number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

const attachmentRow = {
  id: 7,
  campaignId: 3,
  blobUrl: "https://blob.example/zwerfkatten/3/emails/mail.eml",
  fileName: "vraag-gemeente.eml",
  fileSize: 2048,
};

describe("GET /api/zwerfkatten/email/[id]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, email: "sven@asiel.be", role: "beheerder" });
    mockHasPermission.mockReturnValue(true);
    mockSelectLimit.mockResolvedValue([attachmentRow]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
    mockParse.mockResolvedValue({
      subject: "Zwerfkatten Brusselsesteenweg",
      from: { name: "Dienst Dierenwelzijn", address: "info@ninove.be" },
      to: [{ address: "asiel@ninove.be" }],
      date: "2026-07-20T09:30:00.000Z",
      html: "<p>Beste,</p><script>kwaad()</script>",
      text: "Beste,",
      attachments: [
        { filename: "foto.jpg", mimeType: "image/jpeg", content: new ArrayBuffer(4), disposition: "attachment" },
      ],
    });
  });

  it("weigert een niet-ingelogde gebruiker", async () => {
    mockGetSession.mockResolvedValue(null);

    const res = await GET(new Request("http://localhost"), createParams(7));

    expect(res.status).toBe(401);
  });

  it("weigert een gebruiker zonder leesrecht op zwerfkatten", async () => {
    mockHasPermission.mockReturnValue(false);

    const res = await GET(new Request("http://localhost"), createParams(7));

    expect(res.status).toBe(403);
    expect(mockHasPermission).toHaveBeenCalledWith("beheerder", "stray_cat:read");
  });

  it("geeft 404 wanneer de mail niet bestaat", async () => {
    mockSelectLimit.mockResolvedValue([]);

    const res = await GET(new Request("http://localhost"), createParams(7));

    expect(res.status).toBe(404);
  });

  it("geeft de kopgegevens en de gesaneerde inhoud van de mail terug", async () => {
    const res = await GET(new Request("http://localhost"), createParams(7));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.subject).toBe("Zwerfkatten Brusselsesteenweg");
    expect(body.from).toBe("Dienst Dierenwelzijn <info@ninove.be>");
    expect(body.to).toBe("asiel@ninove.be");
    expect(body.date).toBe("2026-07-20T09:30:00.000Z");
    expect(body.document).toContain("<p>Beste,</p>");
    expect(body.document.toLowerCase()).not.toContain("<script");
  });

  it("somt de bijlagen van de mail op zodat ze te openen zijn", async () => {
    const res = await GET(new Request("http://localhost"), createParams(7));
    const body = await res.json();

    expect(body.attachments).toEqual([
      { index: 0, filename: "foto.jpg", mimeType: "image/jpeg", size: 4 },
    ]);
  });

  it("geeft een nette fout wanneer het bestand niet opgehaald kan worden", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as unknown as typeof fetch;

    const res = await GET(new Request("http://localhost"), createParams(7));

    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/niet.*ophalen|mislukt/i);
  });

  it("geeft een nette fout wanneer de mail onleesbaar is", async () => {
    mockParse.mockRejectedValue(new Error("kapotte MIME"));

    const res = await GET(new Request("http://localhost"), createParams(7));

    expect(res.status).toBe(422);
  });
});
