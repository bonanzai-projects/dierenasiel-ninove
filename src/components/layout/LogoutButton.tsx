"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/actions/auth";

interface LogoutButtonProps {
  variant?: "default" | "sidebar" | "menuitem";
}

export default function LogoutButton({ variant = "default" }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    try {
      await logout();
      router.push("/login");
    } catch {
      setIsLoading(false);
    }
  }

  if (variant === "menuitem") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        role="menuitem"
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
      >
        <span aria-hidden="true">🚪</span>
        {isLoading ? "Uitloggen..." : "Uitloggen"}
      </button>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={handleLogout}
        disabled={isLoading}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        <span>🚪</span>
        {isLoading ? "Uitloggen..." : "Uitloggen"}
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
    >
      {isLoading ? "Uitloggen..." : "Uitloggen"}
    </button>
  );
}
