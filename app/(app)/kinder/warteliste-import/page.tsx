import { getCurrentUserRole, canWriteBelegung } from "@/lib/server/current-user-role";
import { WartelisteImportForm } from "@/components/kinder/warteliste-import-form";

export default async function WartelisteImportPage() {
  const role = await getCurrentUserRole();

  if (!canWriteBelegung(role)) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Warteliste importieren
        </h1>
        <p className="text-sm text-muted-foreground">
          Diese Funktion steht dir mit deiner aktuellen Rolle nicht zur
          Verfügung.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Warteliste importieren
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Kinder aus einer CSV/Excel-Liste (z. B. Export aus Little Bird
          oder KitaFinder) als geplante Kinder ohne Gruppe anlegen.
        </p>
      </div>
      <WartelisteImportForm />
    </div>
  );
}
