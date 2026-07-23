// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InfoButton from "./InfoButton";

// jsdom kent <dialog> maar implementeert showModal/close niet volledig.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
});

function renderInfo() {
  return render(
    <InfoButton title="Wat doet de workflow?" label="Uitleg over de workflow">
      <p>Uitleg-inhoud</p>
    </InfoButton>,
  );
}

describe("InfoButton", () => {
  it("toont een knop met een toegankelijke naam", () => {
    renderInfo();
    expect(screen.getByRole("button", { name: "Uitleg over de workflow" })).toBeInTheDocument();
  });

  it("houdt het venster gesloten tot er geklikt wordt", () => {
    const { container } = renderInfo();
    expect(container.querySelector("dialog")?.open).toBe(false);
  });

  it("opent het venster bij een klik op de knop", () => {
    const { container } = renderInfo();

    fireEvent.click(screen.getByRole("button", { name: "Uitleg over de workflow" }));

    expect(container.querySelector("dialog")?.open).toBe(true);
    expect(screen.getByText("Uitleg-inhoud")).toBeInTheDocument();
  });

  it("toont de titel in het venster", () => {
    renderInfo();
    fireEvent.click(screen.getByRole("button", { name: "Uitleg over de workflow" }));

    expect(screen.getByText("Wat doet de workflow?")).toBeInTheDocument();
  });

  it("sluit via de knop 'Begrepen'", () => {
    const { container } = renderInfo();
    fireEvent.click(screen.getByRole("button", { name: "Uitleg over de workflow" }));

    fireEvent.click(screen.getByRole("button", { name: "Begrepen" }));

    expect(container.querySelector("dialog")?.open).toBe(false);
  });

  it("sluit via het kruisje", () => {
    const { container } = renderInfo();
    fireEvent.click(screen.getByRole("button", { name: "Uitleg over de workflow" }));

    fireEvent.click(screen.getByRole("button", { name: "Sluiten" }));

    expect(container.querySelector("dialog")?.open).toBe(false);
  });

  it("sluit wanneer er naast het venster geklikt wordt", () => {
    const { container } = renderInfo();
    fireEvent.click(screen.getByRole("button", { name: "Uitleg over de workflow" }));
    const dialog = container.querySelector("dialog")!;

    fireEvent.click(dialog); // klik op de dialog zelf = de overlay eromheen

    expect(dialog.open).toBe(false);
  });
});
