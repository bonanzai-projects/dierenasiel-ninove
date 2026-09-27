// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { buildAttendanceWeek, type AttendanceEntry } from "@/lib/staff/attendance";

vi.mock("@/lib/actions/staff-attendance", () => ({
  addPersonToDay: vi.fn(),
  removeAttendance: vi.fn(),
  setAttendanceTask: vi.fn(),
  signUpForDay: vi.fn(),
}));
vi.mock("@/lib/actions/staff-slots", () => ({
  assignToSlot: vi.fn(),
  createSlot: vi.fn(),
  deleteSlot: vi.fn(),
  takeSlot: vi.fn(),
}));

import AttendanceWeek from "./AttendanceWeek";

// Story 14.8 — een vast moment uit het weekrooster staat in de week met het label "vast".

const vast: AttendanceEntry = {
  id: -3,
  date: "2026-09-28",
  userId: 21,
  guestName: null,
  userName: "Katrien",
  userRole: "medewerker",
  startTime: "08:00",
  endTime: "12:00",
  task: null,
  slotId: null,
  note: null,
  patternId: 3,
};

function toon(currentUserId: number) {
  return render(
    <AttendanceWeek
      week={buildAttendanceWeek("2026-09-28", [vast])}
      weekStart="2026-09-28"
      prevWeek="2026-09-21"
      nextWeek="2026-10-05"
      today="2026-09-28"
      currentUserId={currentUserId}
      mayManageOthers
      taskSuggestions={[]}
      volunteers={[]}
      slots={[]}
    />,
  );
}

describe("AttendanceWeek — vast weekrooster (Story 14.8)", () => {
  it("toont een vast moment met het label 'vast', zonder uitschrijf- of taakknop", () => {
    toon(20);
    const rij = screen.getByText("Katrien").closest("li")!;
    expect(rij).toHaveTextContent("vast");
    expect(rij).toHaveTextContent("08:00–12:00");
    expect(screen.queryByRole("button", { name: /Katrien .* uitschrijven/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Taak van Katrien/ })).toBeNull();
  });

  it("toont 'Je staat ingeschreven' als je die dag een vast moment hebt", () => {
    toon(21);
    expect(screen.getAllByText("Je staat ingeschreven")).toHaveLength(1);
  });
});
