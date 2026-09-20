import { redirect } from "next/navigation";
import { zustimmungOffen } from "@/lib/server/zustimmung";
import { ZustimmungForm } from "@/components/legal/zustimmung-form";

export default async function ZustimmungPage() {
  if (!(await zustimmungOffen())) redirect("/einrichtung-auswahl");

  return (
    <div className="flex flex-1 flex-col items-center gap-6 p-4 py-16">
      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <h1 className="font-heading text-2xl text-primary">Noch ein Schritt vor dem Start</h1>
        <p className="text-sm text-muted-foreground">
          Bellegio verarbeitet Daten von Kindern und Beschäftigten in deinem Auftrag. Dafür brauchen wir die Zustimmung der Träger-Administration zu den
          Geschäftsbedingungen und zum Auftragsverarbeitungsvertrag.
        </p>
      </div>
      <div className="w-full max-w-xl">
        <ZustimmungForm />
      </div>
    </div>
  );
}
