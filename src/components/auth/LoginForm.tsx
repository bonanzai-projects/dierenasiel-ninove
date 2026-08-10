"use client";

import { useState } from "react";
import Link from "next/link";
import WalkerRegistrationForm from "@/components/wandelaar/WalkerRegistrationForm";

type LoginMode = "surfer" | "wandelaar" | "beheerder";
type Tab = "wandelaar" | "beheerder";

interface LoginFormProps {
  onGuestLogin: () => void;
  onCredentialLogin: (email: string, password: string, mode: LoginMode) => void;
  isLoading: boolean;
  error?: string;
}

export default function LoginForm({
  onGuestLogin,
  onCredentialLogin,
  isLoading,
  error,
}: LoginFormProps) {
  const [tab, setTab] = useState<Tab>("wandelaar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showRegister, setShowRegister] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    onCredentialLogin(email, password, tab);
  }

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all";

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* Tabs */}
      <div className="flex rounded-xl bg-white/10 p-1 mb-5">
        {(["wandelaar", "beheerder"] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setShowRegister(false); }}
            className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
              tab === t
                ? "bg-white/20 text-white shadow-sm"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            {t === "wandelaar" ? "Wandelaar" : "Beheerder"}
          </button>
        ))}
      </div>

      {/* Wandelaar tab: registration form */}
      {tab === "wandelaar" && showRegister ? (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <h3 className="font-heading text-lg font-bold text-white">Registreer als wandelaar</h3>
            <button
              onClick={() => setShowRegister(false)}
              className="text-xs font-medium text-white/70 hover:text-white underline underline-offset-2"
            >
              Terug naar login
            </button>
          </div>
          <WalkerRegistrationForm variant="dark" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error message */}
          {error && (
            <div className="rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3 text-sm text-red-100 text-center">
              {error}
            </div>
          )}

          {/* Email input */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-white/80 mb-1.5">
              E-mailadres
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="naam@voorbeeld.be"
              className={inputClass}
            />
          </div>

          {/* Password input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-white/80 mb-1.5">
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={inputClass}
            />
          </div>

          {/* Login button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password.trim()}
              className={`w-full py-3.5 font-bold rounded-xl transition-all border ${
                tab === "beheerder"
                  ? "bg-[#1b4332] hover:bg-[#14332a] text-white border-[#2d6a4f] hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-[#1b4332]/25"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-emerald-600/25"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isLoading ? "Even geduld..." : `Inloggen als ${tab}`}
            </button>
          </div>

          {/* Wachtwoord vergeten — geldt voor elke rol */}
          <p className="text-center text-sm text-white/60">
            <Link
              href={email.trim() ? `/wachtwoord-vergeten?email=${encodeURIComponent(email.trim())}` : "/wachtwoord-vergeten"}
              className="font-semibold text-white/90 underline underline-offset-2 hover:text-white"
            >
              Wachtwoord vergeten?
            </Link>
          </p>

          {/* Wandelaar: registratie link */}
          {tab === "wandelaar" && (
            <p className="text-center text-sm text-white/60">
              Nog geen account?{" "}
              <button
                type="button"
                onClick={() => setShowRegister(true)}
                className="font-semibold text-white/90 hover:text-white underline underline-offset-2"
              >
                Registreer als nieuwe wandelaar
              </button>
            </p>
          )}
        </form>
      )}

    </div>
  );
}
