import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import EventForm from "@/components/beheerder/evenementen/EventForm";

export default async function NieuwEvenementPage() {
  const permCheck = await requirePermission("event:write");
  if (permCheck && !permCheck.success) {
    redirect("/beheerder/evenementen");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/beheerder/evenementen" className="text-sm text-[#2d6a4f] hover:underline">
        ← Terug naar evenementen
      </Link>
      <h1 className="font-heading text-2xl font-bold text-[#1b4332]">Nieuw evenement</h1>
      <EventForm mode="create" />
    </div>
  );
}
