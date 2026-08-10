"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import LogoutButton from "@/components/layout/LogoutButton";

interface UserMenuProps {
  userName: string;
  userRole: string;
}

/** "Katrien Van Damme" -> "KV", "Sven" -> "SV" */
export function initialen(naam: string): string {
  const delen = naam.trim().split(/\s+/).filter(Boolean);
  if (delen.length === 0) return "?";
  if (delen.length === 1) return delen[0].slice(0, 2).toUpperCase();
  return (delen[0][0] + delen[1][0]).toUpperCase();
}

export default function UserMenu({ userName, userRole }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const knopRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    function bijKlikBuiten(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function bijEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        knopRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", bijKlikBuiten);
    document.addEventListener("keydown", bijEscape);
    return () => {
      document.removeEventListener("mousedown", bijKlikBuiten);
      document.removeEventListener("keydown", bijEscape);
    };
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={knopRef}
        type="button"
        onClick={() => setOpen((vorige) => !vorige)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-gray-200 bg-white py-1 pl-1 pr-2 text-left transition-colors hover:bg-gray-50 sm:pr-3"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1b4332] text-xs font-bold text-white">
          {initialen(userName)}
        </span>
        <span className="hidden sm:block">
          <span className="block text-sm font-medium leading-tight text-gray-700">
            {userName}
          </span>
          <span className="block text-[11px] leading-tight text-gray-500">
            {userRole}
          </span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Accountmenu"
          className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-800">{userName}</p>
            <p className="mt-0.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
              {userRole}
            </p>
          </div>
          <div className="p-1">
            <Link
              href="/beheerder/account"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Wachtwoord wijzigen
            </Link>
            <LogoutButton variant="menuitem" />
          </div>
        </div>
      )}
    </div>
  );
}
