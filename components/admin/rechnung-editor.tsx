"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEuro, type PositionInput } from "@/lib/admin/abrechnung";
import { gibRechnungFrei, loescheRechnungsEntwurf, speichereRechnungsEntwurf } from "@/lib/actions/admin";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

type Zeile = {
  beschreibung: string;
  einrichtung_id: string;
  menge: string;
  einheit: string;
  einzelpreis_netto: string;
  kinderzahl_snapshot: number | null;
};

function zuZeile(p: PositionInput): Zeile {
  return {
    beschreibung: p.beschreibung,
    einrichtung_id: p.einrichtung_id ?? "",
    menge: String(p.menge),
    einheit: p.einheit,
    einzelpreis_netto: String(p.einzelpreis_netto),
    kinderzahl_snapshot: p.kinderzahl_snapshot,
  };
}

export function RechnungEditor({
  rechnungId,
  initial,
  positionen,
  einrichtungen,
}: {
  rechnungId: string;
  initial: { leistungszeitraum_von: string; leistungszeitraum_bis: string; ust_satz: number; notiz: string | null };
  positionen: PositionInput[];
  einrichtungen: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [von, setVon] = useState(initial.leistungszeitraum_von);
  const [bis, setBis] = useState(initial.leistungszeitraum_bis);
  const [ustSatz, setUstSatz] = useState(String(initial.ust_satz));
  const [notiz, setNotiz] = useState(initial.notiz ?? "");
  const [zeilen, setZeilen] = useState<Zeile[]>(positionen.map(zuZeile));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gespeichert, setGespeichert] = useState(false);

  function aendere(index: number, patch: Partial<Zeile>) {
    setGespeichert(false);
    setZeilen((alt) => alt.map((z, i) => (i === index ? { ...z, ...patch } : z)));
  }

  function alsInput(): Parameters<typeof speichereRechnungsEntwurf>[1] {
    return {
      leistungszeitraum_von: von,
      leistungszeitraum_bis: bis,
      ust_satz: Number(ustSatz),
      notiz: notiz.trim() || null,
      positionen: zeilen.map((z) => ({
        beschreibung: z.beschreibung,
        einrichtung_id: z.einrichtung_id || null,
        einrichtung_name: einrichtungen.find((e) => e.id === z.einrichtung_id)?.name ?? null,
        menge: Number(z.menge.replace(",", ".")) || 0,
        einheit: z.einheit,
        einzelpreis_netto: Number(z.einzelpreis_netto.replace(",", ".")) || 0,
        kinderzahl_snapshot: z.kinderzahl_snapshot,
      })),
    };
  }

  async function ausfuehren(aktion: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      await aktion();
    } catch (err) {
      if (err instanceof Error && err.message !== "NEXT_REDIRECT") setError(err.message);
      else if (!(err instanceof Error)) throw err;
    } finally {
      setPending(false);
    }
  }

  const netto = zeilen.reduce(
    (s, z) => s + Math.round((Number(z.menge.replace(",", ".")) || 0) * (Number(z.einzelpreis_netto.replace(",", ".")) || 0) * 100) / 100,
    0
  );

  return (
    <div className="flex flex-col gap-5 rounded-2xl border bg-secondary/30 p-6 print:hidden">
      <h2 className="font-heading text-lg text-primary">Entwurf bearbeiten</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="von">Leistungszeitraum von</Label>
          <Input id="von" type="date" value={von} onChange={(e) => { setVon(e.target.value); setGespeichert(false); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bis">bis</Label>
          <Input id="bis" type="date" value={bis} onChange={(e) => { setBis(e.target.value); setGespeichert(false); }} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ust">USt-Satz (%)</Label>
          <Input id="ust" type="number" min={0} max={100} step="0.1" value={ustSatz} onChange={(e) => { setUstSatz(e.target.value); setGespeichert(false); }} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Positionen</Label>
        {zeilen.map((zeile, index) => (
          <div key={index} className="grid grid-cols-12 items-end gap-2 rounded-lg border bg-background p-2">
            <div className="col-span-12 flex flex-col gap-1 sm:col-span-5">
              <span className="text-xs text-muted-foreground">Beschreibung</span>
              <Input value={zeile.beschreibung} onChange={(e) => aendere(index, { beschreibung: e.target.value })} />
            </div>
            <div className="col-span-12 flex flex-col gap-1 sm:col-span-3">
              <span className="text-xs text-muted-foreground">Einrichtung</span>
              <select className={SELECT_CLASS} value={zeile.einrichtung_id} onChange={(e) => aendere(index, { einrichtung_id: e.target.value })}>
                <option value="">Keine</option>
                {einrichtungen.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="col-span-3 flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs text-muted-foreground">Menge</span>
              <Input inputMode="decimal" value={zeile.menge} onChange={(e) => aendere(index, { menge: e.target.value })} />
            </div>
            <div className="col-span-4 flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs text-muted-foreground">Einheit</span>
              <Input value={zeile.einheit} onChange={(e) => aendere(index, { einheit: e.target.value })} />
            </div>
            <div className="col-span-4 flex flex-col gap-1 sm:col-span-1">
              <span className="text-xs text-muted-foreground">Einzelpreis</span>
              <Input inputMode="decimal" value={zeile.einzelpreis_netto} onChange={(e) => aendere(index, { einzelpreis_netto: e.target.value })} />
            </div>
            <div className="col-span-1 flex justify-end sm:col-span-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Position entfernen"
                onClick={() => { setGespeichert(false); setZeilen((alt) => alt.filter((_, i) => i !== index)); }}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => { setGespeichert(false); setZeilen((alt) => [...alt, { beschreibung: "", einrichtung_id: "", menge: "1", einheit: "Monat", einzelpreis_netto: "0", kinderzahl_snapshot: null }]); }}
        >
          <Plus className="size-3.5" />
          Position hinzufügen
        </Button>
        <p className="text-sm text-muted-foreground">Summe netto: <span className="font-medium text-foreground">{formatEuro(netto)}</span></p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notiz">Hinweistext auf der Rechnung (optional)</Label>
        <Input id="notiz" value={notiz} onChange={(e) => { setNotiz(e.target.value); setGespeichert(false); }} />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            ausfuehren(async () => {
              await speichereRechnungsEntwurf(rechnungId, alsInput());
              setGespeichert(true);
              router.refresh();
            })
          }
        >
          Entwurf speichern
        </Button>
        <Button
          type="button"
          disabled={pending}
          onClick={() =>
            ausfuehren(async () => {
              if (!window.confirm("Rechnung freigeben? Danach ist sie unveränderlich und bekommt ihre Rechnungsnummer.")) return;
              await speichereRechnungsEntwurf(rechnungId, alsInput());
              await gibRechnungFrei(rechnungId);
              router.refresh();
            })
          }
        >
          Speichern &amp; freigeben
        </Button>
        <Button
          type="button"
          variant="ghost"
          disabled={pending}
          className="text-destructive"
          onClick={() =>
            ausfuehren(async () => {
              if (!window.confirm("Entwurf endgültig löschen?")) return;
              await loescheRechnungsEntwurf(rechnungId);
            })
          }
        >
          Entwurf löschen
        </Button>
        {gespeichert ? <span className="text-xs text-primary">Gespeichert.</span> : null}
      </div>
    </div>
  );
}
