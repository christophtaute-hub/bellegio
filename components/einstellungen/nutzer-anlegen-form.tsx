"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { legeNutzerAn } from "@/lib/actions/berechtigungen";
import {
  BEREICHE,
  ROLLEN,
  ZUGRIFFE,
  erzeugePasswort,
  type Bereich,
  type NeueRolle,
  type Zugriff,
} from "@/lib/nutzer/verwaltung";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30";

const KEINE_RECHTE: Record<Bereich, Zugriff> = {
  belegung: "kein_zugriff",
  personal: "kein_zugriff",
  controlling: "kein_zugriff",
  szenario: "kein_zugriff",
};

/** Legt einen Nutzer an: mit direkt vergebenem Passwort (sofort nutzbar) oder per Einladungs-Mail, dazu Rolle und
 * Rechte je Bereich für die gewählten Einrichtungen. Feinjustierung je Einrichtung bleibt in der Liste darunter. */
export function NutzerAnlegenForm({ einrichtungen }: { einrichtungen: { id: string; name: string }[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [zugang, setZugang] = useState<"passwort" | "einladung">("passwort");
  const [passwort, setPasswort] = useState("");
  const [rolle, setRolle] = useState<NeueRolle>("mitarbeiter");
  const [gewaehlt, setGewaehlt] = useState<string[]>(einrichtungen.map((e) => e.id));
  const [rechte, setRechte] = useState<Record<Bereich, Zugriff>>(KEINE_RECHTE);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zugangsdaten, setZugangsdaten] = useState<{ email: string; passwort: string | null } | null>(null);
  const [kopiert, setKopiert] = useState(false);

  async function anlegen(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setZugangsdaten(null);
    const ergebnis = await legeNutzerAn({
      email,
      name,
      passwort: zugang === "passwort" ? passwort : null,
      rolle,
      einrichtungIds: rolle === "mitarbeiter" ? gewaehlt : [],
      rechte,
    });
    setPending(false);
    if (!ergebnis.ok) {
      setError(ergebnis.error);
      return;
    }
    setZugangsdaten({ email: email.trim().toLowerCase(), passwort: zugang === "passwort" ? passwort : null });
    setKopiert(false);
    setName("");
    setEmail("");
    setPasswort("");
    router.refresh();
  }

  return (
    <form className="flex flex-col gap-4 rounded-xl border bg-card p-4" onSubmit={anlegen}>
      <h3 className="font-heading text-base text-primary">Neuen Nutzer anlegen</h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nutzer-name">Name</Label>
          <Input id="nutzer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nutzer-email">E-Mail (= Benutzername beim Login)</Label>
          <Input id="nutzer-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@beispiel.de" required />
        </div>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <span className="text-xs text-muted-foreground">Zugang</span>
        <label className="flex items-center gap-2">
          <input type="radio" checked={zugang === "passwort"} onChange={() => setZugang("passwort")} />
          Passwort direkt vergeben — der Nutzer kann sich sofort anmelden
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" checked={zugang === "einladung"} onChange={() => setZugang("einladung")} />
          Per E-Mail einladen (Link zum Passwort-Festlegen; braucht funktionierenden Mailversand)
        </label>
      </div>

      {zugang === "passwort" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nutzer-passwort">Passwort (mind. 10 Zeichen)</Label>
            <Input id="nutzer-passwort" type="text" autoComplete="off" value={passwort} onChange={(e) => setPasswort(e.target.value)} className="w-64 font-mono" required />
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={() => setPasswort(erzeugePasswort())}>
            Passwort erzeugen
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="nutzer-rolle">Rolle</Label>
        <select id="nutzer-rolle" className={`${SELECT_CLASS} w-56`} value={rolle} onChange={(e) => setRolle(e.target.value as NeueRolle)}>
          {ROLLEN.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">{ROLLEN.find((r) => r.value === rolle)?.hinweis}</p>
      </div>

      {rolle === "mitarbeiter" ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Für diese Einrichtungen</span>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {einrichtungen.map((e) => (
                <label key={e.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={gewaehlt.includes(e.id)}
                    onChange={(ev) => setGewaehlt((alt) => (ev.target.checked ? [...alt, e.id] : alt.filter((id) => id !== e.id)))}
                  />
                  {e.name}
                </label>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {BEREICHE.map((b) => (
              <div key={b.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`recht-${b.key}`}>{b.label}</Label>
                <select
                  id={`recht-${b.key}`}
                  className={SELECT_CLASS}
                  value={rechte[b.key]}
                  onChange={(e) => setRechte((alt) => ({ ...alt, [b.key]: e.target.value as Zugriff }))}
                >
                  {ZUGRIFFE.map((z) => (
                    <option key={z.value} value={z.value}>
                      {z.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" size="sm" className="w-fit" disabled={pending}>
        {pending ? "Wird angelegt…" : zugang === "passwort" ? "Nutzer mit Passwort anlegen" : "Nutzer einladen"}
      </Button>

      {zugangsdaten ? (
        <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-medium text-primary">{zugangsdaten.passwort ? "Nutzer angelegt — hier sind die Zugangsdaten:" : `Einladung an ${zugangsdaten.email} verschickt.`}</p>
          {zugangsdaten.passwort ? (
            <>
              <p className="font-mono">
                {zugangsdaten.email} · {zugangsdaten.passwort}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    await navigator.clipboard.writeText(`E-Mail: ${zugangsdaten.email}\nPasswort: ${zugangsdaten.passwort}`);
                    setKopiert(true);
                  }}
                >
                  {kopiert ? "Kopiert" : "Zugangsdaten kopieren"}
                </Button>
                <span className="text-xs text-muted-foreground">Das Passwort wird nur jetzt angezeigt.</span>
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
