"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { speichereBeitraege, type BeitragEintrag } from "@/lib/actions/beitraege";
import { preisSchluessel } from "@/lib/finanzen/elternbeitraege";
import { meldeErfolg, meldeFehler } from "@/lib/toast";

type Spalte = { art: "krippe" | "kindergarten" | null; auswaertig: boolean; titel: string };

/** Interne Preisliste: Elternbeitrag je Monat und Buchungszeit — wahlweise getrennt nach Krippe/Kindergarten und nach Wohnsitz
 * (am Standort / von außerhalb). Ohne Preisliste bleiben Elternbeiträge aus dem Ergebnis heraus. */
export function BeitraegeEditor({
  einrichtungId,
  baender,
  preise,
  gueltigAb,
  versionen,
  standortGemeinde,
  nachArtVorbelegt,
  nachWohnsitzVorbelegt,
  regeln,
  canEdit,
}: {
  einrichtungId: string;
  baender: { id: string; label: string }[];
  /** Beträge der angezeigten Fassung, Schlüssel siehe `preisSchluessel` (Band, Gruppenart, Wohnsitz). */
  preise: Record<string, number>;
  gueltigAb: string;
  /** Alle vorhandenen „gültig ab“-Daten (neueste zuerst). */
  versionen: string[];
  standortGemeinde: string | null;
  nachArtVorbelegt: boolean;
  nachWohnsitzVorbelegt: boolean;
  regeln: { zweitProzent: number | null; abDrittProzent: number | null; zuschussBis: string | null };
  canEdit: boolean;
}) {
  const [datum, setDatum] = useState(gueltigAb);
  const [nachArt, setNachArt] = useState(nachArtVorbelegt);
  const [nachWohnsitz, setNachWohnsitz] = useState(nachWohnsitzVorbelegt);
  const [gemeinde, setGemeinde] = useState(standortGemeinde ?? "");
  const [werte, setWerte] = useState<Record<string, string>>(() => Object.fromEntries(Object.entries(preise).map(([k, v]) => [k, String(v)])));
  const [geschwisterAn, setGeschwisterAn] = useState(regeln.zweitProzent !== null || regeln.abDrittProzent !== null);
  const [zweit, setZweit] = useState(String(regeln.zweitProzent ?? 50));
  const [abDritt, setAbDritt] = useState(String(regeln.abDrittProzent ?? 0));
  const [zuschussAn, setZuschussAn] = useState(regeln.zuschussBis !== null);
  const [zuschussBis, setZuschussBis] = useState(regeln.zuschussBis ?? "2026-12-31");
  const [istPending, starte] = useTransition();
  const hatPreise = Object.keys(preise).length > 0;

  const arten: ("krippe" | "kindergarten" | null)[] = nachArt ? ["krippe", "kindergarten"] : [null];
  const wohnsitze = nachWohnsitz ? [false, true] : [false];
  const spalten: Spalte[] = arten.flatMap((art) =>
    wohnsitze.map((auswaertig) => ({
      art,
      auswaertig,
      titel: [art === "krippe" ? "Krippe" : art === "kindergarten" ? "Kindergarten" : null, nachWohnsitz ? (auswaertig ? "von außerhalb" : "am Standort") : null]
        .filter(Boolean)
        .join(" · ") || "Beitrag",
    }))
  );

  function speichern() {
    if (nachWohnsitz && !gemeinde.trim()) {
      meldeFehler("Bitte die Standort-Gemeinde angeben, damit Kinder von außerhalb erkannt werden.");
      return;
    }
    const eintraege: BeitragEintrag[] = baender.flatMap((b) =>
      spalten.map((sp) => {
        const text = werte[preisSchluessel(b.id, sp.art, sp.auswaertig)];
        return { bandId: b.id, gruppenart: sp.art, auswaertig: sp.auswaertig, betrag: text?.trim() ? Number(text.replace(",", ".")) : null };
      })
    );
    starte(async () => {
      const zahl = (t: string) => (t.trim() ? Number(t.replace(",", ".")) : null);
      const r = await speichereBeitraege(einrichtungId, datum, eintraege, nachWohnsitz ? gemeinde : undefined, {
        zweitProzent: geschwisterAn ? zahl(zweit) : null,
        abDrittProzent: geschwisterAn ? zahl(abDritt) : null,
        zuschussBis: zuschussAn ? zuschussBis : null,
      });
      if (r.ok) meldeErfolg("Preisliste gespeichert.");
      else meldeFehler(r.error);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium">Elternbeiträge (eure Preisliste)</p>
        <p className="text-xs text-muted-foreground">
          Monatlicher Beitrag je Buchungszeit. Sobald Preise eingetragen sind, fließen die Elternbeiträge ins Ergebnis ein. Verpflegung und Pflegemittel werden nicht eingerechnet. Leer lassen = kein Preis.
          {hatPreise ? "" : " Aktuell ist keine Preisliste hinterlegt."}
        </p>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={nachArt} onCheckedChange={setNachArt} disabled={!canEdit} aria-label="Krippe und Kindergarten haben unterschiedliche Preise" />
          Krippe und Kindergarten haben unterschiedliche Preise
        </label>
        <label className="flex items-center gap-2">
          <Switch checked={nachWohnsitz} onCheckedChange={setNachWohnsitz} disabled={!canEdit} aria-label="Kinder von außerhalb zahlen einen anderen Preis" />
          Kinder von außerhalb zahlen einen anderen Preis
        </label>
        {nachWohnsitz ? (
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Standort-Gemeinde (Wohnort der Kinder, die den Standardpreis zahlen)
            <Input className="h-8 w-60" value={gemeinde} disabled={!canEdit} placeholder="z. B. München" onChange={(e) => setGemeinde(e.target.value)} />
          </label>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={geschwisterAn} onCheckedChange={setGeschwisterAn} disabled={!canEdit} aria-label="Geschwisterermäßigung" />
          Geschwisterermäßigung
        </label>
        {geschwisterAn ? (
          <div className="flex flex-wrap items-end gap-3 text-xs text-muted-foreground">
            <label className="flex flex-col gap-1">
              2. Kind zahlt (% des Preises)
              <Input inputMode="decimal" className="h-8 w-24 text-right tabular-nums" value={zweit} disabled={!canEdit} onChange={(e) => setZweit(e.target.value)} />
            </label>
            <label className="flex flex-col gap-1">
              ab dem 3. Kind zahlt (%)
              <Input inputMode="decimal" className="h-8 w-24 text-right tabular-nums" value={abDritt} disabled={!canEdit} onChange={(e) => setAbDritt(e.target.value)} />
            </label>
            <p className="max-w-md">Den Platz in der Familie trägst du im Kinderprofil ein. Kinder mit Elternbeitragszuschuss bekommen keine Ermäßigung.</p>
          </div>
        ) : null}
        <label className="flex items-center gap-2">
          <Switch checked={zuschussAn} onCheckedChange={setZuschussAn} disabled={!canEdit} aria-label="Elternbeitragszuschuss" />
          Eltern erhalten den Elternbeitragszuschuss (Bayern)
        </label>
        {zuschussAn ? (
          <div className="flex flex-wrap items-end gap-3 text-xs text-muted-foreground">
            <label className="flex flex-col gap-1">
              Zuschuss gibt es bis
              <Input type="date" className="h-8 w-40" value={zuschussBis} disabled={!canEdit} onChange={(e) => setZuschussBis(e.target.value)} />
            </label>
            <p className="max-w-md">Ab September des Jahres, in dem das Kind drei wird. Eure Einnahmen bleiben gleich — ihr erhaltet den Zuschuss und gebt ihn weiter.</p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Gültig ab
          <Input type="date" className="h-8 w-40" value={datum} disabled={!canEdit} onChange={(e) => setDatum(e.target.value)} />
        </label>
        {versionen.length > 1 ? (
          <p className="text-xs text-muted-foreground">Vorhandene Fassungen: {versionen.map((v) => new Date(`${v}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" })).join(", ")}</p>
        ) : null}
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-secondary/40 text-left">
              <th className="p-2 font-medium">Buchungszeit</th>
              {spalten.map((sp) => (
                <th key={`${sp.art}-${sp.auswaertig}`} className="p-2 text-right font-medium whitespace-nowrap">
                  {sp.titel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baender.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="p-2 whitespace-nowrap">{b.label}</td>
                {spalten.map((sp) => {
                  const key = preisSchluessel(b.id, sp.art, sp.auswaertig);
                  return (
                    <td key={key} className="p-1.5 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Input
                          inputMode="decimal"
                          className="h-8 w-24 text-right tabular-nums"
                          value={werte[key] ?? ""}
                          disabled={!canEdit}
                          placeholder="–"
                          onChange={(e) => setWerte((alt) => ({ ...alt, [key]: e.target.value }))}
                          aria-label={`Beitrag ${b.label} ${sp.titel}`}
                        />
                        <span className="text-xs text-muted-foreground">€</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit ? (
        <Button className="self-start" size="sm" onClick={speichern} disabled={istPending}>
          Preisliste speichern
        </Button>
      ) : null}
    </div>
  );
}
