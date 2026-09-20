"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { legeKundenAn } from "@/lib/actions/admin";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { PASSWORT_MIN_LAENGE } from "@/lib/passwort";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

function Feld({ id, label, children, hinweis }: { id: string; label: string; children: React.ReactNode; hinweis?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hinweis ? <p className="text-xs text-muted-foreground">{hinweis}</p> : null}
    </div>
  );
}

export function NeuerKundeForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zugang, setZugang] = useState<"einladung" | "passwort">("einladung");

  return (
    <form
      className="flex max-w-3xl flex-col gap-6"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const text = (name: string) => String(form.get(name) ?? "").trim();
        setPending(true);
        setError(null);
        const ergebnis = await legeKundenAn({
          traegerName: text("traegerName"),
          einrichtungName: text("einrichtungName"),
          bundeslandCode: text("bundeslandCode"),
          ort: text("ort") || null,
          vollzeitWochenstunden: Number(text("vollzeit").replace(",", ".")),
          adminName: text("adminName"),
          adminEmail: text("adminEmail"),
          adminPasswort: zugang === "passwort" ? String(form.get("adminPasswort") ?? "") : null,
          rechnungsanschrift: text("rechnungsanschrift") || null,
          rechnungsEmail: text("rechnungsEmail") || null,
        });
        setPending(false);
        if (!ergebnis.ok) {
          setError(ergebnis.error);
          return;
        }
        router.push("/admin/kunden");
        router.refresh();
      }}
    >
      <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">1. Träger und erste Einrichtung</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Feld id="traegerName" label="Name des Trägers">
            <Input id="traegerName" name="traegerName" required />
          </Feld>
          <Feld id="einrichtungName" label="Name der ersten Einrichtung">
            <Input id="einrichtungName" name="einrichtungName" required />
          </Feld>
          <Feld
            id="bundeslandCode"
            label="Bundesland"
            hinweis="Bestimmt den Rechenweg (Anstellungsschlüssel, VZÄ oder Personalstunden) und lässt sich später nicht mehr ändern."
          >
            <select id="bundeslandCode" name="bundeslandCode" className={SELECT_CLASS} required defaultValue="">
              <option value="" disabled>
                Bitte wählen
              </option>
              {BUNDESLAENDER.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.label}
                </option>
              ))}
            </select>
          </Feld>
          <Feld id="ort" label="Ort">
            <Input id="ort" name="ort" />
          </Feld>
          <Feld id="vollzeit" label="Vollzeit-Wochenstunden (Referenz für VZÄ)">
            <Input id="vollzeit" name="vollzeit" inputMode="decimal" defaultValue="39" required />
          </Feld>
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">2. Träger-Administration</h2>
        <p className="text-sm text-muted-foreground">
          Die Person, die beim Kunden Einrichtungen, Gruppen und Nutzer verwaltet.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Feld id="adminName" label="Name">
            <Input id="adminName" name="adminName" required />
          </Feld>
          <Feld id="adminEmail" label="E-Mail">
            <Input id="adminEmail" name="adminEmail" type="email" required />
          </Feld>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" checked={zugang === "einladung"} onChange={() => setZugang("einladung")} />
            Per E-Mail einladen (Link zum Passwort-Festlegen)
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" checked={zugang === "passwort"} onChange={() => setZugang("passwort")} />
            Passwort direkt vergeben (z. B. zur Übergabe im Gespräch)
          </label>
        </div>
        {zugang === "passwort" ? (
          <Feld id="adminPasswort" label="Start-Passwort" hinweis={`Mindestens ${PASSWORT_MIN_LAENGE} Zeichen. Bitte im Profil ändern lassen.`}>
            <Input id="adminPasswort" name="adminPasswort" type="text" autoComplete="off" required />
          </Feld>
        ) : null}
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">3. Rechnungsdaten (optional)</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Feld id="rechnungsEmail" label="Rechnungs-E-Mail" hinweis="Leer = E-Mail der Administration.">
            <Input id="rechnungsEmail" name="rechnungsEmail" type="email" />
          </Feld>
          <div className="sm:col-span-2">
            <Feld id="rechnungsanschrift" label="Rechnungsanschrift (mehrzeilig)">
              <Textarea id="rechnungsanschrift" name="rechnungsanschrift" rows={3} />
            </Feld>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Preise trägst du danach unter „Kunden &amp; Preise“ ein.</p>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Wird angelegt…" : "Kunden anlegen"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.push("/admin/kunden")}>
          Abbrechen
        </Button>
      </div>
    </form>
  );
}
