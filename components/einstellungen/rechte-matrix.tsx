"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  loescheNutzer,
  setEinrichtungBerechtigung,
  setKannRechteVerwalten,
  setLokalerAdmin,
  setzeNutzerPasswort,
  setzeNutzerRolle,
  sperreNutzer,
} from "@/lib/actions/berechtigungen";
import { erzeugePasswort, ROLLEN, type NeueRolle } from "@/lib/nutzer/verwaltung";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Bereich, Zugriff } from "@/lib/server/current-user-role";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const BEREICHE: { key: Bereich; label: string }[] = [
  { key: "belegung", label: "Belegung" },
  { key: "personal", label: "Personal" },
  { key: "controlling", label: "Controlling" },
  { key: "szenario", label: "Szenario-Rechner" },
];

const ZUGRIFF_OPTIONS: { value: Zugriff; label: string; rang: number }[] = [
  { value: "kein_zugriff", label: "Kein Zugriff", rang: 0 },
  { value: "ansehen", label: "Ansehen", rang: 1 },
  { value: "bearbeiten", label: "Bearbeiten", rang: 2 },
];

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm dark:bg-input/30";

export type MatrixUser = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: string;
  kann_rechte_verwalten: boolean;
  ist_demo?: boolean;
  gesperrt?: boolean;
};

export type MatrixEinrichtung = { id: string; name: string };

export type BerechtigungRow = {
  user_id: string;
  einrichtung_id: string;
  bereich: string;
  zugriff: string;
};

export type LokalerAdminRow = { user_id: string; einrichtung_id: string };

export function RechteMatrix({
  currentUserId,
  istTraegerAdmin,
  einrichtungen,
  users,
  berechtigungen,
  eigeneZugriffe,
  lokaleAdmins,
}: {
  currentUserId: string;
  istTraegerAdmin: boolean;
  einrichtungen: MatrixEinrichtung[];
  users: MatrixUser[];
  berechtigungen: BerechtigungRow[];
  eigeneZugriffe: Record<string, Record<Bereich, Zugriff>>;
  lokaleAdmins: LokalerAdminRow[];
}) {
  const [geoeffneterUser, setGeoeffneterUser] = useState<string | null>(null);

  const zugriffFuer = (userId: string, einrichtungId: string, bereich: Bereich): Zugriff => {
    const treffer = berechtigungen.find(
      (b) =>
        b.user_id === userId &&
        b.einrichtung_id === einrichtungId &&
        b.bereich === bereich
    );
    return (treffer?.zugriff as Zugriff | undefined) ?? "kein_zugriff";
  };

  const istLokalerAdmin = (userId: string, einrichtungId: string): boolean =>
    lokaleAdmins.some((r) => r.user_id === userId && r.einrichtung_id === einrichtungId);

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => {
        const isBlankoRolle =
          user.role === "traeger_admin" || user.role === "einrichtungsleitung";
        const geoeffnet = geoeffneterUser === user.id;
        return (
          <div key={user.id} className="rounded-xl border">
            <button
              type="button"
              onClick={() => setGeoeffneterUser(geoeffnet ? null : user.id)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">
                  {user.full_name || user.email || user.id}
                </span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {isBlankoRolle ? (
                  <Badge variant="secondary">
                    {user.role === "traeger_admin" ? "Träger-Admin" : "Einrichtungsleitung"}
                    {" · voller Zugriff"}
                  </Badge>
                ) : (
                  <Badge variant="secondary">Mitarbeiter</Badge>
                )}
                {user.ist_demo ? <Badge variant="outline">Demo</Badge> : null}
                {user.gesperrt ? <Badge variant="destructive">Gesperrt</Badge> : null}
              </div>
            </button>

            {geoeffnet ? (
              <div className="flex flex-col gap-4 border-t p-4">
                {isBlankoRolle ? (
                  <p className="text-sm text-muted-foreground">
                    Diese Rolle hat automatisch Bearbeiten-Zugriff auf alle
                    Einrichtungen und Bereiche — eine individuelle Zuordnung
                    ist nicht nötig.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Einrichtung</TableHead>
                          {BEREICHE.map((b) => (
                            <TableHead key={b.key}>{b.label}</TableHead>
                          ))}
                          {istTraegerAdmin ? <TableHead>Lokaler Admin</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {einrichtungen.map((einrichtung) => (
                          <TableRow key={einrichtung.id}>
                            <TableCell className="font-medium">
                              {einrichtung.name}
                            </TableCell>
                            {BEREICHE.map((b) => {
                              const eigenerRang =
                                istTraegerAdmin
                                  ? 2
                                  : ZUGRIFF_OPTIONS.find(
                                      (o) =>
                                        o.value ===
                                        (eigeneZugriffe[einrichtung.id]?.[b.key] ??
                                          "kein_zugriff")
                                    )?.rang ?? 0;
                              return (
                                <TableCell key={b.key}>
                                  <ZugriffSelect
                                    userId={user.id}
                                    einrichtungId={einrichtung.id}
                                    bereich={b.key}
                                    wert={zugriffFuer(user.id, einrichtung.id, b.key)}
                                    maxRang={eigenerRang}
                                  />
                                </TableCell>
                              );
                            })}
                            {istTraegerAdmin ? (
                              <TableCell>
                                <LokalerAdminToggle
                                  userId={user.id}
                                  einrichtungId={einrichtung.id}
                                  wert={istLokalerAdmin(user.id, einrichtung.id)}
                                />
                              </TableCell>
                            ) : null}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {istTraegerAdmin && user.id !== currentUserId && user.role !== "traeger_admin" ? (
                  <KontoVerwaltung
                    userId={user.id}
                    name={user.full_name || user.email || ""}
                    rolle={user.role as NeueRolle}
                    gesperrt={user.gesperrt ?? false}
                  />
                ) : null}

                {istTraegerAdmin && user.id !== currentUserId ? (
                  <KannRechteVerwaltenToggle
                    userId={user.id}
                    wert={user.kann_rechte_verwalten}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ZugriffSelect({
  userId,
  einrichtungId,
  bereich,
  wert,
  maxRang,
}: {
  userId: string;
  einrichtungId: string;
  bereich: Bereich;
  wert: Zugriff;
  maxRang: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={wert}
        disabled={isPending}
        className={SELECT_CLASS}
        onChange={(event) => {
          const neuerWert = event.target.value as Zugriff;
          setError(null);
          startTransition(async () => {
            try {
              const ergebnis = await setEinrichtungBerechtigung(userId, einrichtungId, bereich, neuerWert);
              if (!ergebnis.ok) setError(ergebnis.error);
            } catch {
              setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
            }
          });
        }}
      >
        {ZUGRIFF_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} disabled={option.rang > maxRang}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

function KannRechteVerwaltenToggle({
  userId,
  wert,
}: {
  userId: string;
  wert: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <label className="flex w-fit items-center gap-2 text-sm">
      <input
        type="checkbox"
        defaultChecked={wert}
        disabled={isPending}
        onChange={(event) => {
          const neuerWert = event.target.checked;
          setError(null);
          startTransition(async () => {
            try {
              const ergebnis = await setKannRechteVerwalten(userId, neuerWert);
              if (!ergebnis.ok) setError(ergebnis.error);
            } catch {
              setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
            }
          });
        }}
      />
      Darf selbst Rechte für andere Nutzer vergeben (nie mehr als das eigene
      Niveau)
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </label>
  );
}

function LokalerAdminToggle({
  userId,
  einrichtungId,
  wert,
}: {
  userId: string;
  einrichtungId: string;
  wert: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="flex w-fit items-center gap-2 text-sm">
        <input
          type="checkbox"
          defaultChecked={wert}
          disabled={isPending}
          onChange={(event) => {
            const neuerWert = event.target.checked;
            setError(null);
            startTransition(async () => {
              try {
                const ergebnis = await setLokalerAdmin(userId, einrichtungId, neuerWert);
                if (!ergebnis.ok) setError(ergebnis.error);
              } catch {
                setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
              }
            });
          }}
        />
        Darf hier Rechte vergeben
      </label>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  );
}

/** Konto eines Nutzers: Rolle ändern, direkt ein neues Passwort vergeben, sperren/entsperren, Nutzer löschen.
 * Nur für die Träger-Administration. */
function KontoVerwaltung({
  userId,
  name,
  rolle,
  gesperrt,
}: {
  userId: string;
  name: string;
  rolle: NeueRolle;
  gesperrt: boolean;
}) {
  const router = useRouter();
  const [passwort, setPasswort] = useState("");
  const [gesetzt, setGesetzt] = useState<string | null>(null);
  const [bestaetigeLoeschen, setBestaetigeLoeschen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [sperrPending, startSperrTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-secondary/30 p-4">
      <h4 className="text-sm font-medium">Konto</h4>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`rolle-${userId}`}>Rolle</Label>
        <select
          id={`rolle-${userId}`}
          className={`${SELECT_CLASS} w-56`}
          defaultValue={rolle}
          disabled={pending}
          onChange={(e) => {
            setError(null);
            const neu = e.target.value as NeueRolle;
            startTransition(async () => {
              try {
                const ergebnis = await setzeNutzerRolle(userId, neu);
                if (!ergebnis.ok) setError(ergebnis.error);
                else router.refresh();
              } catch {
                setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
              }
            });
          }}
        >
          {ROLLEN.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`pw-${userId}`}>Neues Passwort vergeben</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input id={`pw-${userId}`} type="text" autoComplete="off" value={passwort} onChange={(e) => { setPasswort(e.target.value); setGesetzt(null); }} className="w-64 font-mono" placeholder="mind. 10 Zeichen" />
          <Button type="button" variant="secondary" size="sm" onClick={() => { setPasswort(erzeugePasswort()); setGesetzt(null); }}>
            Erzeugen
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={pending || passwort.length === 0}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  const ergebnis = await setzeNutzerPasswort(userId, passwort);
                  if (!ergebnis.ok) setError(ergebnis.error);
                  else setGesetzt(passwort);
                } catch {
                  setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
                }
              });
            }}
          >
            Passwort setzen
          </Button>
        </div>
        {gesetzt ? (
          <p className="text-xs text-primary">
            Passwort gesetzt. Melde {name} mit <span className="font-mono">{gesetzt}</span> an; es wird nur jetzt angezeigt.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={sperrPending}
          onClick={() => {
            setError(null);
            startSperrTransition(async () => {
              try {
                const ergebnis = await sperreNutzer(userId, !gesperrt);
                if (!ergebnis.ok) setError(ergebnis.error);
                else router.refresh();
              } catch {
                setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
              }
            });
          }}
        >
          {gesperrt ? "Entsperren" : "Sperren"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {bestaetigeLoeschen ? (
          <>
            <span className="text-sm">{name} endgültig löschen?</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  try {
                    const ergebnis = await loescheNutzer(userId);
                    if (!ergebnis.ok) {
                      setError(ergebnis.error);
                      setBestaetigeLoeschen(false);
                    } else router.refresh();
                  } catch {
                    setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
                    setBestaetigeLoeschen(false);
                  }
                });
              }}
            >
              Ja, löschen
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setBestaetigeLoeschen(false)}>
              Abbrechen
            </Button>
          </>
        ) : (
          <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => setBestaetigeLoeschen(true)}>
            Nutzer löschen
          </Button>
        )}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
