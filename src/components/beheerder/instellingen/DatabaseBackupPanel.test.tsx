// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import DatabaseBackupPanel from "./DatabaseBackupPanel";
import type { BackupListItem } from "@/lib/queries/database-backups";

const { mockCreate, mockRestore, mockDelete, mockRefresh } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
  mockRestore: vi.fn(),
  mockDelete: vi.fn(),
  mockRefresh: vi.fn(),
}));

vi.mock("@/lib/actions/database-backup", () => ({
  createBackup: mockCreate,
  restoreBackup: mockRestore,
  deleteBackup: mockDelete,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn() }),
}));

const bewaringen: BackupListItem[] = [
  {
    id: 2,
    label: "Voor de AnimalShelter-import",
    createdAt: new Date("2026-07-30T19:00:00.000Z"),
    createdByName: "Sven",
    isAutomatic: false,
    rowCount: 320,
    sizeBytes: 151_000,
  },
  {
    id: 1,
    label: "Automatisch vóór het terugzetten",
    createdAt: new Date("2026-07-29T08:30:00.000Z"),
    createdByName: "Sven",
    isAutomatic: true,
    rowCount: 318,
    sizeBytes: 150_000,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockCreate.mockResolvedValue({ success: true, message: "Bewaard: 320 rijen (147 kB)." });
  mockRestore.mockResolvedValue({ success: true, message: "Teruggezet: 320 rijen." });
  mockDelete.mockResolvedValue({ success: true, message: "De bewaring is verwijderd." });
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("DatabaseBackupPanel", () => {
  it("toont een knop om nu te bewaren", () => {
    render(<DatabaseBackupPanel backups={[]} />);
    expect(screen.getByRole("button", { name: /Nu bewaren/ })).toBeInTheDocument();
  });

  it("houdt de lijst verborgen tot je erom vraagt, en toont het aantal op de knop", () => {
    render(<DatabaseBackupPanel backups={bewaringen} />);

    expect(screen.queryByText("Voor de AnimalShelter-import")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen \(2\)/ }));

    expect(screen.getByText("Voor de AnimalShelter-import")).toBeInTheDocument();
  });

  it("toont datum, uur en omvang van elke bewaring", () => {
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    expect(screen.getByText(/30\/07\/2026 om 21:00/)).toBeInTheDocument();
    expect(screen.getByText(/320 rijen/)).toBeInTheDocument();
    expect(screen.getByText(/147 kB/)).toBeInTheDocument();
  });

  it("merkt een automatische veiligheidskopie aan", () => {
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    const automatisch = screen.getByText("Automatisch vóór het terugzetten").closest("li")!;
    const handmatig = screen.getByText("Voor de AnimalShelter-import").closest("li")!;
    expect(within(automatisch).getByText("automatisch")).toBeInTheDocument();
    expect(within(handmatig).queryByText("automatisch")).not.toBeInTheDocument();
  });

  it("meldt het wanneer er nog niets bewaard is", () => {
    render(<DatabaseBackupPanel backups={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen \(0\)/ }));

    expect(screen.getByText(/Er is nog niets bewaard/i)).toBeInTheDocument();
  });

  it("bewaart met de naam die je invult", async () => {
    render(<DatabaseBackupPanel backups={[]} />);

    fireEvent.change(screen.getByLabelText(/naam/i), { target: { value: "Voor de import" } });
    fireEvent.click(screen.getByRole("button", { name: /Nu bewaren/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith("Voor de import"));
    await waitFor(() => expect(mockRefresh).toHaveBeenCalled());
  });

  it("toont de melding van de actie", async () => {
    render(<DatabaseBackupPanel backups={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /Nu bewaren/ }));

    expect(await screen.findByText(/Bewaard: 320 rijen/)).toBeInTheDocument();
  });

  it("zet pas terug na een bevestiging", async () => {
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    const rij = screen.getByText("Voor de AnimalShelter-import").closest("li")!;
    fireEvent.click(within(rij).getByRole("button", { name: /Terugzetten/ }));

    expect(window.confirm).toHaveBeenCalled();
    await waitFor(() => expect(mockRestore).toHaveBeenCalledWith(2));
  });

  it("doet niets wanneer je het terugzetten annuleert", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    const rij = screen.getByText("Voor de AnimalShelter-import").closest("li")!;
    fireEvent.click(within(rij).getByRole("button", { name: /Terugzetten/ }));

    expect(mockRestore).not.toHaveBeenCalled();
  });

  it("verwijdert een bewaring na bevestiging", async () => {
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    const rij = screen.getByText("Voor de AnimalShelter-import").closest("li")!;
    fireEvent.click(within(rij).getByRole("button", { name: /Verwijderen/ }));

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(2));
  });

  it("toont een foutmelding wanneer het terugzetten mislukt", async () => {
    mockRestore.mockResolvedValue({ success: false, error: "Het terugzetten is misgelopen." });
    render(<DatabaseBackupPanel backups={bewaringen} />);
    fireEvent.click(screen.getByRole("button", { name: /Bewaarde momenten tonen/ }));

    const rij = screen.getByText("Voor de AnimalShelter-import").closest("li")!;
    fireEvent.click(within(rij).getByRole("button", { name: /Terugzetten/ }));

    expect(await screen.findByText(/misgelopen/)).toBeInTheDocument();
  });
});
