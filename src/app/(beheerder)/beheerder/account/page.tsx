import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import ChangePasswordForm from "@/components/beheerder/account/ChangePasswordForm";

/**
 * Bewust géén permissiecheck: dit scherm gaat over je eigen account, dus elke
 * ingelogde gebruiker hoort erbij te kunnen.
 */
export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="mx-auto max-w-4xl">
      <div>
        <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Mijn account</h1>
        <p className="mt-1 text-sm text-gray-500">
          {session.name} · {session.email}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#1b4332]">Wachtwoord wijzigen</h2>
        <p className="mt-1 mb-4 text-sm text-gray-600">
          Kies iets dat je zelf onthoudt — een beheerder kan je wachtwoord niet zien.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
