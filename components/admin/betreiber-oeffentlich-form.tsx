"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { speichereBetreiberOeffentlich } from "@/lib/actions/admin";
import type { BetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";

type Werte = { [K in keyof BetreiberOeffentlich]: BetreiberOeffentlich[K] extends string | null ? string : BetreiberOeffentlich[K] };

const zuText = (b: BetreiberOeffentlich): Werte => ({
  firmenname: b.firmenname ?? "",
  anschrift: b.anschrift ?? "",
  email: b.email ?? "",
  telefon: b.telefon ?? "",
  vertretungsberechtigt: b.vertretungsberechtigt ?? "",
  registergericht: b.registergericht ?? "",
  registernummer: b.registernummer ?? "",
  ust_id: b.ust_id ?? "",
  inhaltlich_verantwortlich: b.inhaltlich_verantwortlich ?? "",
  datenschutz_email: b.datenschutz_email ?? "",
  aufsichtsbehoerde: b.aufsichtsbehoerde ?? "",
  aufbewahrung_anfragen_monate: b.aufbewahrung_anfragen_monate,
  rechtstexte_geprueft: b.rechtstexte_geprueft,
});

function Feld({ id, label, hinweis, children }: { id: string; label: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hinweis ? <p className="text-xs text-muted-foreground">{hinweis}</p> : null}
    </div>
  );
}

export function BetreiberOeffentlichForm({
  initial,
  rechnungsdaten,
}: {
  initial: BetreiberOeffentlich;
  /** Firmenname, Anschrift und USt-IdNr. aus den Rechnungs-Betreiberdaten zum Übernehmen. */
  rechnungsdaten: { firmenname: string | null; anschrift: string | null; ust_id: string | null };
}) {
  const [w, setW] = useState<Werte>(zuText(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  const setze = <K extends keyof Werte>(key: K, wert: Werte[K]) => {
    setGespeichert(false);
    setW((alt) => ({ ...alt, [key]: wert }));
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setGespeichert(false);
        const ergebnis = await speichereBetreiberOeffentlich({
          ...w,
          aufbewahrung_anfragen_monate: Number(w.aufbewahrung_anfragen_monate),
        });
        setPending(false);
        if (!ergebnis.ok) setError(ergebnis.error);
        else setGespeichert(true);
      }}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-fit"
        onClick={() => {
          setGespeichert(false);
          setW((alt) => ({
            ...alt,
            firmenname: alt.firmenname || rechnungsdaten.firmenname || "",
            anschrift: alt.anschrift || rechnungsdaten.anschrift || "",
            ust_id: alt.ust_id || rechnungsdaten.ust_id || "",
          }));
        }}
      >
        Leere Felder aus den Rechnungsdaten füllen
      </Button>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feld id="oe-firma" label="Firmenname / Name">
          <Input id="oe-firma" value={w.firmenname} onChange={(e) => setze("firmenname", e.target.value)} />
        </Feld>
        <Feld id="oe-email" label="E-Mail-Adresse">
          <Input id="oe-email" type="email" value={w.email} onChange={(e) => setze("email", e.target.value)} />
        </Feld>
        <div className="sm:col-span-2">
          <Feld id="oe-anschrift" label="Anschrift (mehrzeilig, letzte Zeile = PLZ und Ort)">
            <Textarea id="oe-anschrift" rows={3} value={w.anschrift} onChange={(e) => setze("anschrift", e.target.value)} />
          </Feld>
        </div>
        <Feld id="oe-telefon" label="Telefon (optional)">
          <Input id="oe-telefon" value={w.telefon} onChange={(e) => setze("telefon", e.target.value)} />
        </Feld>
        <Feld id="oe-vertreten" label="Vertretungsberechtigte Person(en)" hinweis="Bei Gesellschaften Pflicht, bei Einzelunternehmen leer lassen.">
          <Input id="oe-vertreten" value={w.vertretungsberechtigt} onChange={(e) => setze("vertretungsberechtigt", e.target.value)} />
        </Feld>
        <Feld id="oe-gericht" label="Registergericht (falls eingetragen)">
          <Input id="oe-gericht" value={w.registergericht} onChange={(e) => setze("registergericht", e.target.value)} />
        </Feld>
        <Feld id="oe-nummer" label="Registernummer">
          <Input id="oe-nummer" value={w.registernummer} onChange={(e) => setze("registernummer", e.target.value)} />
        </Feld>
        <Feld id="oe-ust" label="Umsatzsteuer-ID">
          <Input id="oe-ust" value={w.ust_id} onChange={(e) => setze("ust_id", e.target.value)} />
        </Feld>
        <Feld id="oe-datenschutz" label="E-Mail für Datenschutzanfragen" hinweis="Leer = allgemeine E-Mail-Adresse.">
          <Input id="oe-datenschutz" type="email" value={w.datenschutz_email} onChange={(e) => setze("datenschutz_email", e.target.value)} />
        </Feld>
        <div className="sm:col-span-2">
          <Feld id="oe-aufsicht" label="Zuständige Datenschutz-Aufsichtsbehörde" hinweis="Die Behörde deines Bundeslandes (Sitz des Unternehmens).">
            <Input id="oe-aufsicht" value={w.aufsichtsbehoerde} onChange={(e) => setze("aufsichtsbehoerde", e.target.value)} />
          </Feld>
        </div>
        <div className="sm:col-span-2">
          <Feld id="oe-verantwortlich" label="Inhaltlich verantwortlich nach § 18 Abs. 2 MStV (optional)" hinweis="Nur nötig, wenn die Seite journalistisch-redaktionelle Inhalte enthält.">
            <Textarea id="oe-verantwortlich" rows={2} value={w.inhaltlich_verantwortlich} onChange={(e) => setze("inhaltlich_verantwortlich", e.target.value)} />
          </Feld>
        </div>
        <Feld id="oe-anfragen" label="Anfragen aufbewahren (Monate)" hinweis="Steht so in der Datenschutzerklärung; im Bereich Demo-Anfragen löschst du ältere mit einem Klick.">
          <Input id="oe-anfragen" inputMode="numeric" value={String(w.aufbewahrung_anfragen_monate)} onChange={(e) => setze("aufbewahrung_anfragen_monate", Number(e.target.value.replace(/\D/g, "")) || 0)} className="w-32" />
        </Feld>
      </div>

      <label className="flex items-start gap-2 rounded-xl border bg-secondary/40 p-4 text-sm">
        <input type="checkbox" className="mt-0.5" checked={w.rechtstexte_geprueft} onChange={(e) => setze("rechtstexte_geprueft", e.target.checked)} />
        <span>
          <strong>Rechtstexte juristisch geprüft und freigegeben.</strong> Erst dann verschwindet der Entwurfshinweis auf Impressum, Datenschutz, AGB, AVV und
          Sicherheitsseite, und Träger-Administratoren müssen AGB und AVV beim nächsten Login bestätigen.
        </span>
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern…" : "Speichern"}
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
