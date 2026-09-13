import { db } from "@/lib/db";
import { animals } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import PublicAdoptionForm from "@/components/adoptie/PublicAdoptionForm";
import { adoptionChoice } from "@/lib/animals/adoption-choice";

export const dynamic = "force-dynamic";

export default async function KatAdoptieAanvraagPage() {
  const adoptableCats = await db
    .select({ id: animals.id, name: animals.name, imageUrl: animals.imageUrl, images: animals.images })
    .from(animals)
    .where(
      and(
        eq(animals.species, "kat"),
        eq(animals.isAvailableForAdoption, true),
      ),
    )
    .orderBy(asc(animals.name));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#d8f3dc] to-white px-4 py-8">
      <PublicAdoptionForm
        species="kat"
        adoptableAnimals={adoptableCats.map(adoptionChoice)}
      />
    </div>
  );
}
