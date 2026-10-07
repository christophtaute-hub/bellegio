import type { BeitraegeJeGruppe } from "@/lib/finanzen/elternbeitraege";

const euro = (n: number) => n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

/** Elternbeiträge je Gruppe und Ø je Kind (heute) — bewusst ohne „Ergebnis je Gruppe“: Personalkosten lassen sich ohne
 * Verteilschlüssel nicht fair einer Gruppe zuordnen. */
export function BeitraegeJeGruppeTabelle({ zeilen, kinderOhnePreis }: { zeilen: BeitraegeJeGruppe[]; kinderOhnePreis: number }) {
  const summe = zeilen.reduce((s, z) => s + z.erloes, 0);
  const kinder = zeilen.reduce((s, z) => s + z.kinder, 0);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="beitraege-titel">
      <h2 id="beitraege-titel" className="font-heading text-lg text-primary">
        Elternbeiträge je Gruppe (heute)
      </h2>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Gruppe</th>
              <th className="px-3 py-2.5 text-right font-medium">Kinder</th>
              <th className="px-3 py-2.5 text-right font-medium">Beiträge im Monat</th>
              <th className="px-4 py-2.5 text-right font-medium">Ø je Kind</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.gruppeId ?? "ohne"} className="border-b last:border-0">
                <td className="px-4 py-2.5 font-medium">{z.name}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{z.kinder}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{euro(z.erloes)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{z.durchschnitt !== null ? euro(z.durchschnitt) : "–"}</td>
              </tr>
            ))}
            <tr className="bg-secondary/40 font-semibold">
              <td className="px-4 py-2.5">Gesamt</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{kinder}</td>
              <td className="px-3 py-2.5 text-right tabular-nums">{euro(summe)}</td>
              <td className="px-4 py-2.5 text-right tabular-nums">{kinder - kinderOhnePreis > 0 ? euro(summe / (kinder - kinderOhnePreis)) : "–"}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {kinderOhnePreis > 0 ? (
        <p className="text-xs text-muted-foreground">
          {kinderOhnePreis} {kinderOhnePreis === 1 ? "Kind hat" : "Kinder haben"} keine Buchungszeit oder keinen Preis in der Preisliste und {kinderOhnePreis === 1 ? "fehlt" : "fehlen"} in der Summe.
        </p>
      ) : null}
    </section>
  );
}
