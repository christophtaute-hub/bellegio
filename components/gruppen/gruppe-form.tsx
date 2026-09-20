"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createGruppe, updateGruppe, archiviereGruppe } from "@/lib/actions/gruppen";
import { GRUPPENART_LABEL } from "@/lib/constants";
import {
  BW_BETRIEBSFORMEN,
  NRW_BUCHUNGSZEITEN,
  NRW_GRUPPENFORMEN,
  type GruppeInput,
} from "@/lib/gruppen/optionen";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const LEER: GruppeInput = {
  name: "",
  gruppenart: "kindergarten",
  sollplatze: 20,
  bwBetriebsform: null,
  bwAltersmischung: false,
  bwOeffnungszeitStunden: null,
  nrwGruppenform: null,
  nrwBuchungszeitStunden: null,
};

function Feld({ id, label, hinweis, children }: { id: string; label: string; hinweis?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hinweis ? <p className="text-xs text-muted-foreground">{hinweis}</p> : null}
    </div>
  );
}

export function GruppeForm({
  mode,
  gruppeId,
  bundeslandCode,
  initial,
}: {
  mode: "create" | "edit";
  gruppeId?: string;
  bundeslandCode: string;
  initial?: GruppeInput;
}) {
  const router = useRouter();
  const [werte, setWerte] = useState<GruppeInput>(initial ?? LEER);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bestaetigeArchiv, setBestaetigeArchiv] = useState(false);

  const setze = <K extends keyof GruppeInput>(key: K, wert: GruppeInput[K]) =>
    setWerte((alt) => ({ ...alt, [key]: wert }));

  const bwForm = BW_BETRIEBSFORMEN.find((f) => f.value === werte.bwBetriebsform);

  async function speichern(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const ergebnis =
      mode === "create" ? await createGruppe(werte) : await updateGruppe(gruppeId!, werte);
    setPending(false);
    if (!ergebnis.ok) {
      setError(ergebnis.error);
      return;
    }
    router.push(`/gruppen/${ergebnis.id}`);
    router.refresh();
  }

  async function archivieren() {
    setPending(true);
    setError(null);
    const ergebnis = await archiviereGruppe(gruppeId!);
    setPending(false);
    if (!ergebnis.ok) {
      setError(ergebnis.error);
      setBestaetigeArchiv(false);
      return;
    }
    router.push("/gruppen");
    router.refresh();
  }

  return (
    <form className="flex max-w-2xl flex-col gap-5" onSubmit={speichern}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Feld id="gruppe-name" label="Name der Gruppe">
          <Input id="gruppe-name" value={werte.name} onChange={(e) => setze("name", e.target.value)} required />
        </Feld>
        <Feld id="gruppe-art" label="Gruppenart">
          <select id="gruppe-art" className={SELECT_CLASS} value={werte.gruppenart} onChange={(e) => setze("gruppenart", e.target.value)}>
            {Object.entries(GRUPPENART_LABEL).map(([wert, label]) => (
              <option key={wert} value={wert}>
                {label}
              </option>
            ))}
          </select>
        </Feld>
        <Feld id="gruppe-plaetze" label="Sollplätze" hinweis="Genehmigte Plätze laut Betriebserlaubnis.">
          <Input
            id="gruppe-plaetze"
            type="number"
            min={1}
            max={200}
            value={Number.isFinite(werte.sollplatze) ? werte.sollplatze : ""}
            onChange={(e) => setze("sollplatze", e.target.value === "" ? Number.NaN : Number(e.target.value))}
            required
          />
        </Feld>
      </div>

      {bundeslandCode === "bw" ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-secondary/30 p-4 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground sm:col-span-2">
            In Baden-Württemberg bestimmt die Betriebsform den Personalbedarf (KiTaVO). Die Öffnungszeit passt den
            Sollwert je Stunde gegenüber der Referenz an.
          </p>
          <Feld id="gruppe-betriebsform" label="Betriebsform">
            <select
              id="gruppe-betriebsform"
              className={SELECT_CLASS}
              value={werte.bwBetriebsform ?? ""}
              onChange={(e) => setze("bwBetriebsform", e.target.value || null)}
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {BW_BETRIEBSFORMEN.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Feld>
          <Feld id="gruppe-oeffnung" label="Tägliche Öffnungszeit (Stunden)">
            <Input
              id="gruppe-oeffnung"
              inputMode="decimal"
              value={werte.bwOeffnungszeitStunden ?? ""}
              onChange={(e) =>
                setze("bwOeffnungszeitStunden", e.target.value.trim() === "" ? null : Number(e.target.value.replace(",", ".")))
              }
              required
            />
          </Feld>
          {bwForm?.altersmischungMoeglich ? (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input type="checkbox" checked={werte.bwAltersmischung} onChange={(e) => setze("bwAltersmischung", e.target.checked)} />
              Altersmischung (Kinder unter und über drei Jahren in einer Gruppe)
            </label>
          ) : null}
        </div>
      ) : null}

      {bundeslandCode === "nrw" ? (
        <div className="grid grid-cols-1 gap-3 rounded-xl border bg-secondary/30 p-4 sm:grid-cols-2">
          <p className="text-sm text-muted-foreground sm:col-span-2">
            In Nordrhein-Westfalen legen Gruppenform und Buchungszeit die Personalstunden fest (Anlage zu § 33 KiBiz).
          </p>
          <Feld id="gruppe-gruppenform" label="Gruppenform">
            <select
              id="gruppe-gruppenform"
              className={SELECT_CLASS}
              value={werte.nrwGruppenform ?? ""}
              onChange={(e) => setze("nrwGruppenform", e.target.value || null)}
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {NRW_GRUPPENFORMEN.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </Feld>
          <Feld id="gruppe-buchungszeit" label="Buchungszeit (Stunden pro Woche)">
            <select
              id="gruppe-buchungszeit"
              className={SELECT_CLASS}
              value={werte.nrwBuchungszeitStunden ?? ""}
              onChange={(e) => setze("nrwBuchungszeitStunden", e.target.value ? Number(e.target.value) : null)}
              required
            >
              <option value="" disabled>
                Bitte wählen
              </option>
              {NRW_BUCHUNGSZEITEN.map((z) => (
                <option key={z} value={z}>
                  {z} Stunden
                </option>
              ))}
            </select>
          </Feld>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern…" : mode === "create" ? "Gruppe anlegen" : "Änderungen speichern"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push(mode === "edit" ? `/gruppen/${gruppeId}` : "/gruppen")}>
          Abbrechen
        </Button>
        {mode === "edit" ? (
          bestaetigeArchiv ? (
            <span className="ml-auto flex items-center gap-2 text-sm">
              Gruppe wirklich archivieren?
              <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={archivieren}>
                Ja, archivieren
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setBestaetigeArchiv(false)}>
                Nein
              </Button>
            </span>
          ) : (
            <Button type="button" variant="ghost" className="ml-auto text-destructive" onClick={() => setBestaetigeArchiv(true)}>
              Gruppe archivieren
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}
