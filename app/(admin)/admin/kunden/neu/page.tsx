import { NeuerKundeForm } from "@/components/admin/neuer-kunde-form";

export default function NeuerKundePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Neuen Kunden anlegen</h1>
        <p className="text-sm text-muted-foreground">
          Legt Träger, erste Einrichtung und die Träger-Administration in einem Schritt an. Gruppen, Personal und
          Kinder pflegt der Kunde danach selbst — oder importiert sie aus Excel.
        </p>
      </div>
      <NeuerKundeForm />
    </div>
  );
}
