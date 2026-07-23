// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AutoGrowTextarea, { autoGrow } from "./AutoGrowTextarea";

describe("autoGrow", () => {
  it("zet de hoogte gelijk aan de inhoud", () => {
    const el = document.createElement("textarea");
    // jsdom rekent geen layout; scrollHeight zelf voorzien.
    Object.defineProperty(el, "scrollHeight", { value: 320, configurable: true });

    autoGrow(el);

    expect(el.style.height).toBe("320px");
  });

  it("laat de hoogte los wanneer er geen layout is (scrollHeight 0)", () => {
    const el = document.createElement("textarea");
    Object.defineProperty(el, "scrollHeight", { value: 0, configurable: true });

    autoGrow(el);

    // 'auto' i.p.v. een vastgeklikte hoogte van 0px
    expect(el.style.height).toBe("auto");
  });

  it("valt niet over een ontbrekend element", () => {
    expect(() => autoGrow(null)).not.toThrow();
    expect(() => autoGrow(undefined)).not.toThrow();
  });
});

describe("AutoGrowTextarea", () => {
  it("behoudt rows als minimumhoogte en de opgegeven naam", () => {
    render(<AutoGrowTextarea name="description" rows={10} aria-label="Tekst" />);
    const textarea = screen.getByLabelText("Tekst") as HTMLTextAreaElement;

    expect(textarea.rows).toBe(10);
    expect(textarea.name).toBe("description");
  });

  it("legt geen maximum op de inhoud op", () => {
    render(<AutoGrowTextarea rows={4} aria-label="Tekst" />);
    const textarea = screen.getByLabelText("Tekst") as HTMLTextAreaElement;
    const lange_tekst = Array.from({ length: 40 }, (_, i) => `regel ${i}`).join("\n");

    fireEvent.input(textarea, { target: { value: lange_tekst } });

    expect(textarea.value).toBe(lange_tekst);
    expect(textarea.maxLength).toBe(-1); // geen maxLength gezet
  });

  it("groeit mee bij invoer en roept de eigen onInput nog steeds aan", () => {
    const onInput = vi.fn();
    render(<AutoGrowTextarea rows={4} aria-label="Tekst" onInput={onInput} />);
    const textarea = screen.getByLabelText("Tekst") as HTMLTextAreaElement;
    Object.defineProperty(textarea, "scrollHeight", { value: 500, configurable: true });

    fireEvent.input(textarea, { target: { value: "veel tekst" } });

    expect(textarea.style.height).toBe("500px");
    expect(onInput).toHaveBeenCalled();
  });

  it("verbergt de interne scrollbalk", () => {
    render(<AutoGrowTextarea rows={4} aria-label="Tekst" />);
    const textarea = screen.getByLabelText("Tekst") as HTMLTextAreaElement;

    expect(textarea.style.overflow).toBe("hidden");
  });

  it("stelt de hoogte in op basis van de begininhoud", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<AutoGrowTextarea ref={ref} rows={4} aria-label="Tekst" defaultValue="a\nb\nc" />);
    // Zonder layout in jsdom blijft dit 'auto'; het gaat erom dat er gemeten wordt.
    expect(ref.current?.style.height).toBe("auto");
  });
});
