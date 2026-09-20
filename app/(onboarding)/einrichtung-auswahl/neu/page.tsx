import { notFound } from "next/navigation";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { NeueEinrichtungForm } from "@/components/einrichtung/neue-einrichtung-form";

export default async function NeueEinrichtungPage() {
  if ((await getCurrentUserRole()) !== "traeger_admin") notFound();

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 py-16">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl text-primary">Neue Einrichtung anlegen</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Danach legst du die Gruppen an und übernimmst Personal und Kinder — von Hand oder aus Excel.
        </p>
      </div>
      <NeueEinrichtungForm />
    </div>
  );
}
