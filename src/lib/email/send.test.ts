import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSend } = vi.hoisted(() => ({
  mockSend: vi.fn(),
}));

vi.mock("./index", () => ({
  getResend: () => (process.env.RESEND_API_KEY ? { emails: { send: mockSend } } : null),
}));

import { resolveFrom, sendEmail } from "./send";

describe("resolveFrom", () => {
  it("zet naam en adres samen zoals Resend het verwacht", () => {
    expect(resolveFrom({ FROM_EMAIL: "noreply@send.bonanzai.be", FROM_NAME: "Dierenasiel Ninove" })).toBe(
      "Dierenasiel Ninove <noreply@send.bonanzai.be>",
    );
  });

  it("valt terug op een standaardnaam", () => {
    expect(resolveFrom({ FROM_EMAIL: "noreply@send.bonanzai.be" })).toBe(
      "Dierenasiel Ninove <noreply@send.bonanzai.be>",
    );
  });

  it("geeft null zonder afzendadres", () => {
    expect(resolveFrom({})).toBeNull();
    expect(resolveFrom({ FROM_EMAIL: "  " })).toBeNull();
  });
});

describe("sendEmail", () => {
  const params = {
    to: "test@example.com",
    subject: "Test Subject",
    html: "<p>Test</p>",
  };

  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockSend.mockReset();
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.FROM_EMAIL = "noreply@send.bonanzai.be";
    process.env.FROM_NAME = "Dierenasiel Ninove";
    delete process.env.REPLY_TO_EMAIL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("geeft een fout wanneer RESEND_API_KEY ontbreekt", async () => {
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain("RESEND_API_KEY");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("geeft een fout wanneer er geen afzender geconfigureerd is", async () => {
    delete process.env.FROM_EMAIL;

    const result = await sendEmail(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain("FROM_EMAIL");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("verstuurt met de afzender uit de configuratie en geeft het Resend-id terug", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_123" }, error: null });

    const result = await sendEmail(params);

    expect(result.success).toBe(true);
    expect(result.id).toBe("msg_123");
    expect(mockSend).toHaveBeenCalledWith({
      to: ["test@example.com"],
      from: "Dierenasiel Ninove <noreply@send.bonanzai.be>",
      subject: "Test Subject",
      html: "<p>Test</p>",
    });
  });

  it("laat een expliciete afzender voorgaan op de configuratie", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    await sendEmail({ ...params, from: "honden@dierenasielninove.be" });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ from: "honden@dierenasielninove.be" }),
    );
  });

  it("stuurt een tekstversie mee wanneer die er is", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    await sendEmail({ ...params, text: "Platte tekst" });

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({ text: "Platte tekst" }));
  });

  it("zet replyTo uit REPLY_TO_EMAIL", async () => {
    process.env.REPLY_TO_EMAIL = "info@bonanzai.be";
    mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    await sendEmail(params);

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: "info@bonanzai.be" }),
    );
  });

  it("laat replyTo weg wanneer die niet ingesteld is", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    await sendEmail(params);

    expect(Object.keys(mockSend.mock.calls[0][0])).not.toContain("replyTo");
  });

  it("aanvaardt meerdere ontvangers", async () => {
    mockSend.mockResolvedValue({ data: { id: "msg_1" }, error: null });

    await sendEmail({ ...params, to: ["a@x.be", "b@x.be"] });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["a@x.be", "b@x.be"] }),
    );
  });

  it("herkent een fout die Resend in het antwoord meegeeft", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "Domain not verified" } });

    const result = await sendEmail(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Domain not verified");
  });

  it("vangt een netwerkfout op zonder te throwen", async () => {
    mockSend.mockRejectedValue(new Error("Resend API error"));

    const result = await sendEmail(params);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Resend API error");
  });
});
