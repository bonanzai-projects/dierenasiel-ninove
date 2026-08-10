import type { Metadata } from "next";
import Link from "next/link";
import AuthCard from "@/components/auth/AuthCard";
import SetPasswordForm from "@/components/auth/SetPasswordForm";
import { findUserByToken } from "@/lib/auth/account-links";
import { reasonMessage } from "@/lib/auth/tokens";

export const metadata: Metadata = {
  title: "Wachtwoord instellen",
};

/**
 * De link wordt hier al nagekeken, vóór het formulier verschijnt. Iemand eerst
 * twee keer een wachtwoord laten intypen om dán pas te zeggen dat zijn link
 * vervallen is, is nodeloos vervelend.
 */
export default async function WachtwoordInstellenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const lookup = await findUserByToken(decodeURIComponent(token));

  if (!lookup.ok) {
    return (
      <AuthCard title="Deze link werkt niet meer">
        <p className="text-sm text-white/80">{reasonMessage(lookup.reason)}</p>
        <Link
          href="/wachtwoord-vergeten"
          className="mt-4 block w-full rounded-xl border border-[#2d6a4f] bg-[#1b4332] py-3 text-center font-bold text-white hover:bg-[#14332a]"
        >
          Vraag een nieuwe link aan
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Hallo ${lookup.user.name}`}>
      <SetPasswordForm token={token} />
    </AuthCard>
  );
}
