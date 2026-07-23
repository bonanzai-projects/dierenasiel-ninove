"use client";

import { useEffect, useLayoutEffect, type RefObject, type TextareaHTMLAttributes } from "react";

/**
 * Story 10.33: een tekstvak dat meegroeit met zijn inhoud.
 *
 * `rows` blijft de **minimum** zichtbare hoogte; wie meer tekst typt, ziet het
 * vak uitzetten in plaats van in een klein scrollvenster te belanden. Er is dus
 * geen maximum aantal regels — enkel een startformaat.
 */

/** Zet de hoogte van een tekstvak gelijk aan zijn inhoud. */
export function autoGrow(el: HTMLTextAreaElement | null | undefined): void {
  if (!el) return;
  el.style.height = "auto";
  // scrollHeight is 0 in omgevingen zonder layout (jsdom); dan niets forceren.
  if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
}

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  ref?: RefObject<HTMLTextAreaElement | null>;
};

export default function AutoGrowTextarea({ ref, onInput, style, ...props }: Props) {
  // useLayoutEffect zodat de begin-hoogte klopt vóór de eerste verf-beurt;
  // op de server bestaat die hook niet, vandaar de terugval.
  const useIsomorphicLayoutEffect =
    typeof window === "undefined" ? useEffect : useLayoutEffect;

  useIsomorphicLayoutEffect(() => {
    autoGrow(ref?.current);
  }, [ref, props.defaultValue]);

  return (
    <textarea
      {...props}
      ref={ref}
      style={{ overflow: "hidden", resize: "vertical", ...style }}
      onInput={(event) => {
        autoGrow(event.currentTarget);
        onInput?.(event);
      }}
    />
  );
}
