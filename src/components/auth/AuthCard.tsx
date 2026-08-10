import Image from "next/image";
import Link from "next/link";
import { SITE_LOGO_URL } from "@/lib/constants";

/**
 * Omkadering voor de losstaande accountschermen (wachtwoord vergeten en
 * instellen). Bewust dezelfde donkere achtergrond als het loginscherm: wie hier
 * terechtkomt via een mail, moet meteen zien dat hij bij het asiel zit.
 */
export default function AuthCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#1b4332] to-[#0f291f] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Image
            src={SITE_LOGO_URL}
            alt="Dierenasiel Ninove"
            width={72}
            height={72}
            className="h-16 w-auto"
            priority
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
          <h1 className="mb-4 text-xl font-bold text-white">{title}</h1>
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-white/60">
          <Link href="/login" className="underline underline-offset-2 hover:text-white">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </main>
  );
}
