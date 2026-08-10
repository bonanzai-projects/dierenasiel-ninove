// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserForm from "./UserForm";

// Het formulier scrollt naar het eerste foutveld; jsdom kent scrollIntoView niet.
if (!("scrollIntoView" in HTMLElement.prototype)) {
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    value: () => {},
    writable: true,
    configurable: true,
  });
}

const { mockCreateUser, mockUpdateUser, mockSendUserInvite } = vi.hoisted(() => ({
  mockCreateUser: vi.fn(),
  mockUpdateUser: vi.fn(),
  mockSendUserInvite: vi.fn(),
}));

vi.mock("@/lib/actions/users", () => ({
  createUser: mockCreateUser,
  updateUser: mockUpdateUser,
  sendUserInvite: mockSendUserInvite,
}));

const bestaande = {
  id: 7,
  name: "Nathalie",
  email: "nathalie@asiel.be",
  role: "medewerker",
  isActive: true,
};

beforeEach(() => {
  mockCreateUser.mockReset().mockResolvedValue({
    success: true,
    data: { sent: true },
    message: "Gebruiker aangemaakt. De uitnodiging is verstuurd naar nathalie@asiel.be.",
  });
  mockUpdateUser.mockReset().mockResolvedValue({ success: true, data: undefined });
  mockSendUserInvite.mockReset().mockResolvedValue({
    success: true,
    data: { sent: true },
    message: "Uitnodiging verstuurd naar nathalie@asiel.be.",
  });
});

describe("UserForm — nieuwe gebruiker", () => {
  it("vraagt geen wachtwoord meer", () => {
    render(<UserForm editUser={null} onClose={() => {}} />);

    expect(screen.queryByLabelText(/wachtwoord/i)).toBeNull();
  });

  it("legt uit dat de gebruiker zelf een wachtwoord instelt", () => {
    render(<UserForm editUser={null} onClose={() => {}} />);

    expect(screen.getByText(/zelf/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /aanmaken en uitnodigen/i })).toBeInTheDocument();
  });

  it("sluit het formulier wanneer de uitnodiging vertrokken is", async () => {
    const onClose = vi.fn();
    const { container } = render(<UserForm editUser={null} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText("Naam *"), { target: { value: "Nathalie" } });
    fireEvent.change(screen.getByLabelText("E-mail *"), { target: { value: "n@asiel.be" } });
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("toont de link en blijft open wanneer de mail niet vertrok", async () => {
    const onClose = vi.fn();
    mockCreateUser.mockResolvedValue({
      success: true,
      data: { sent: false, inviteUrl: "https://asiel.be/wachtwoord-instellen/abc123" },
      message: "Gebruiker aangemaakt, maar de uitnodiging kon niet verstuurd worden.",
    });

    const { container } = render(<UserForm editUser={null} onClose={onClose} />);
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText("https://asiel.be/wachtwoord-instellen/abc123")).toBeInTheDocument(),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /kopieer link/i })).toBeInTheDocument();
  });

  it("houdt de ingevulde waarden vast na een fout", async () => {
    mockCreateUser.mockResolvedValue({
      success: false,
      error: "Er bestaat al een gebruiker met dit e-mailadres",
      values: { name: "Nathalie", email: "n@asiel.be", role: "medewerker" },
    });

    const { container } = render(<UserForm editUser={null} onClose={() => {}} />);
    fireEvent.submit(container.querySelector("form")!);

    await waitFor(() =>
      expect(screen.getByText(/bestaat al een gebruiker/i)).toBeInTheDocument(),
    );
    expect((screen.getByLabelText("Naam *") as HTMLInputElement).value).toBe("Nathalie");
    expect((screen.getByLabelText("E-mail *") as HTMLInputElement).value).toBe("n@asiel.be");
  });
});

describe("UserForm — bestaande gebruiker", () => {
  it("biedt een knop om de uitnodiging opnieuw te versturen", () => {
    render(<UserForm editUser={bestaande} onClose={() => {}} />);

    expect(screen.getByRole("button", { name: /uitnodiging versturen/i })).toBeInTheDocument();
  });

  it("heeft geen veld meer om zelf een wachtwoord in te typen", () => {
    render(<UserForm editUser={bestaande} onClose={() => {}} />);

    expect(screen.queryByLabelText(/nieuw wachtwoord/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /^reset$/i })).toBeNull();
  });

  it("bevestigt dat de uitnodiging vertrokken is", async () => {
    render(<UserForm editUser={bestaande} onClose={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /uitnodiging versturen/i }));

    await waitFor(() =>
      expect(screen.getByText(/uitnodiging verstuurd naar/i)).toBeInTheDocument(),
    );
  });

  it("toont de link wanneer de mail niet vertrok", async () => {
    mockSendUserInvite.mockResolvedValue({
      success: true,
      data: { sent: false, inviteUrl: "https://asiel.be/wachtwoord-instellen/xyz" },
      message: "De uitnodiging kon niet verstuurd worden.",
    });

    render(<UserForm editUser={bestaande} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /uitnodiging versturen/i }));

    await waitFor(() =>
      expect(screen.getByText("https://asiel.be/wachtwoord-instellen/xyz")).toBeInTheDocument(),
    );
  });
});
