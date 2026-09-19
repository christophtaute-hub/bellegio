"use client";

import { useState } from "react";
import { cn } from "cn";

const LAENDER = [
  {
    code: "by",
    name: "Bayern",
    formel: "Anstellungsschlüssel = Σ Gewichtungsfaktor je Kind ÷ VZÄ ≤ 11,0",
    erklaerung:
      "Jedes Kind zählt nach Alter und Bedarf unterschiedlich (unter drei Jahre 2,0 · ab drei Jahren 1,0 · Integrationskind 4,5). Die gewichtete Summe wird durch die Vollzeitäquivalente des Personals geteilt.",
    beispiel: [
      ["Gewichtete Kinderzahl", "25,7"],
      ["Personal (VZÄ)", "2,77"],
      ["Anstellungsschlüssel", "1 : 9,28"],
    ],
  },
  {
    code: "bw",
    name: "Baden-Württemberg",
    formel: "Soll-VZÄ = Referenz-VZÄ + (Öffnungszeit − Referenz) × Stellen/Std.",
    erklaerung:
      "Die KiTaVO legt je Betriebsform (Halbtag, Regelgruppe, verlängerte Öffnungszeit, Ganztag, Krippe) einen festen VZÄ-Sollwert fest. Die Kinderzahl geht in die Formel nicht ein.",
    beispiel: [
      ["Ganztagsgruppe (7 Std.)", "2,30 VZÄ"],
      ["Kinderkrippe (7 Std.)", "2,06 VZÄ"],
      ["Regelgruppe (6 Std.)", "1,80 VZÄ"],
    ],
  },
  {
    code: "nrw",
    name: "Nordrhein-Westfalen",
    formel: "Personalstunden = Tabellenwert je Gruppenform × Buchungszeit",
    erklaerung:
      "Das KiBiz gibt je Gruppenform (I, II, III) und Buchungszeit (25/35/45 Std.) feste Fachkraft- und Ergänzungskraft-Stunden vor — unabhängig von der tatsächlichen Kinderzahl.",
    beispiel: [
      ["Gruppenform", "I · II · III"],
      ["Buchungszeit", "25 · 35 · 45 Std."],
      ["Ergebnis", "Fachkraft- + Ergänzungskraft-Std."],
    ],
  },
] as const;

export function BundeslandSwitcher() {
  const [aktiv, setAktiv] = useState<(typeof LAENDER)[number]["code"]>("by");
  const land = LAENDER.find((l) => l.code === aktiv)!;

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" aria-label="Bundesland" className="inline-flex self-start rounded-full bg-secondary p-1">
        {LAENDER.map((l) => (
          <button
            key={l.code}
            role="tab"
            type="button"
            aria-selected={aktiv === l.code}
            onClick={() => setAktiv(l.code)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm transition-colors",
              aktiv === l.code ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.name}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-4 rounded-2xl border bg-card p-6 shadow-sm">
        <p className="rounded-lg bg-secondary/60 p-3 font-mono text-sm font-semibold text-primary">{land.formel}</p>
        <p className="text-sm text-muted-foreground">{land.erklaerung}</p>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {land.beispiel.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-secondary/40 p-3">
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="text-lg font-semibold tabular-nums text-primary">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] text-muted-foreground">Vereinfachte Darstellung mit Beispielwerten — die Berechnung in der App folgt dem jeweiligen Gesetz samt Quellenangabe.</p>
      </div>
    </div>
  );
}
