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

function createParams(id: string | number, index: string | number) {
  return { params: Promise.resolve({ id: String(id), index: String(index) }) };
}

describe("GET /api/zwerfkatten/email/[id]/attachment/[index]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockResolvedValue({ userId: 1, email: "sven@asiel.be", role: "beheerder" });
    mockHasPermission.mockReturnValue(true);
    mockSelectLimit.mockResolvedValue([
      { id: 7, campaignId: 3, blobUrl: "https://blob.example/mail.eml", fileName: "mail.eml" },
    ]);
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(8),
    }) as unknown as typeof fetch;
    mockParse.mockResolvedValue({
      attachments: [
        { filename: "plan.pdf", mimeType: "application/pdf", content: new Uint8Array([1, 2, 3]).buffer },
      ],
    });
  });

  it("weigert een gebruiker zonder leesrecht", async () => {
    mockHasPermission.mockReturnValue(false);

    const res = await GET(new Request("http://localhost"), createParams(7, 0));

    expect(res.status).toBe(403);
  });

  it("geeft de bijlage terug met het juiste type en bestandsnaam", async () => {
    const res = await GET(new Request("http://localhost"), createParams(7, 0));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("content-disposition")).toContain("plan.pdf");
    expect(await res.arrayBuffer()).toHaveProperty("byteLength", 3);
  });

  it("geeft 404 bij een onbestaande bijlage-index", async () => {
    const res = await GET(new Request("http://localhost"), createParams(7, 5));

    expect(res.status).toBe(404);
  });
});
