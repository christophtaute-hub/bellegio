/** Nur im Druck sichtbarer Kopf: Titel, Einrichtung/Stand und Stammdaten als
 * Feldliste — ersetzt im Ausdruck das (bearbeitbare) Formular. */
export function DruckKopf({
  titel,
  untertitel,
  felder,
}: {
  titel: string;
  untertitel: string;
  felder: { label: string; wert: string }[];
}) {
  return (
    <div className="hidden flex-col gap-3 print:flex">
      <div className="flex flex-col gap-0.5 border-b pb-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{titel}</p>
        <p className="text-sm text-muted-foreground">{untertitel}</p>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {felder.map((feld) => (
          <div key={feld.label} className="flex gap-2">
            <dt className="w-40 shrink-0 text-muted-foreground">{feld.label}</dt>
            <dd className="font-medium">{feld.wert || "–"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
