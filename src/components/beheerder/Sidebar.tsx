"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isNavItemActive } from "@/lib/navigation/active";
import type { NavItem } from "@/lib/navigation";

interface SidebarProps {
  items: NavItem[];
}

export default function Sidebar({ items }: SidebarProps) {
  const pathname = usePathname();
  const allHrefs = items.map((item) => item.href);

  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-full w-60 flex-col bg-[#1b4332] shadow-xl xl:flex">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-3">
        <span className="text-2xl">🐾</span>
        <div>
          <p className="font-heading text-sm font-bold text-white">
            Dierenasiel Ninove
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
            Beheerder
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <Link
            key={item.label}
            href={item.href}
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
    </aside>
  );
}
