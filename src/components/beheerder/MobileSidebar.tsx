"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { isNavItemActive } from "@/lib/navigation/active";
import type { NavItem } from "@/lib/navigation";

interface MobileSidebarProps {
  items: NavItem[];
}

export default function MobileSidebar({ items }: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const allHrefs = items.map((item) => item.href);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="rounded-lg p-2 text-[#1b4332] transition-colors hover:bg-gray-100 xl:hidden"
          aria-label="Menu openen"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="4" x2="20" y1="12" y2="12" />
            <line x1="4" x2="20" y1="6" y2="6" />
            <line x1="4" x2="20" y1="18" y2="18" />
          </svg>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-60 bg-[#1b4332] p-0">
        <SheetHeader className="border-b border-white/10 px-5 py-3">
          <SheetTitle className="flex items-center gap-3">
            <span className="text-2xl">🐾</span>
            <div>
              <p className="font-heading text-sm font-bold text-white">
                Dierenasiel Ninove
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                Beheerder
              </p>
            </div>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 space-y-0.5 px-3 py-4">
          {items.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                isNavItemActive(item.href, pathname, allHrefs)
                  ? "bg-white/15 font-semibold text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
