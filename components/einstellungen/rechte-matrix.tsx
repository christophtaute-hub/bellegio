"use client";

import { Switch } from "@/components/ui/switch";
import { Fragment, useState, useTransition } from "react";
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
import { erzeugePasswort, gruppiereNachCluster, ROLLEN, type NeueRolle } from "@/lib/nutzer/verwaltung";
import { Button } from "@/components/ui/button";
import { ZugriffSchalter, ZugriffSchalterGespeichert } from "@/components/einstellungen/zugriff-schalter";
import { BEREICHE, standardZugriffEinrichtungsleitung, type Bereich, type Zugriff } from "@/lib/nutzer/bereiche";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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

export type MatrixEinrichtung = { id: string; name: string; cluster: string | null };

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

  const zugriffFuer = (userId: string, einrichtungId: string, bereich: Bereich, rolle: string): Zugriff => {
    const treffer = berechtigungen.find(
      (b) =>
        b.user_id === userId &&
        b.einrichtung_id === einrichtungId &&
        b.bereich === bereich
    );
    const explizit = treffer?.zugriff as Zugriff | undefined;
    if (explizit) return explizit;
    // Die Einrichtungsleitung hat ohne eigene Einstellung ihren Standard (alles außer Finanzübersicht und Einzelgehälter).
    return rolle === "einrichtungsleitung" ? standardZugriffEinrichtungsleitung(bereich) : "kein_zugriff";
  };

  const istLokalerAdmin = (userId: string, einrichtungId: string): boolean =>
    lokaleAdmins.some((r) => r.user_id === userId && r.einrichtung_id === einrichtungId);

  const clusterGruppen = gruppiereNachCluster(einrichtungen);
  const colSpanGesamt = 1 + BEREICHE.length + (istTraegerAdmin ? 1 : 0);

  return (
    <div className="flex flex-col gap-3">
      {users.map((user) => {
        const isBlankoRolle = user.role === "traeger_admin";
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
                  <Badge variant="secondary">Träger-Admin · voller Zugriff</Badge>
                ) : (
                  <Badge variant="secondary">{user.role === "einrichtungsleitung" ? "Einrichtungsleitung" : "Mitarbeiter"}</Badge>
                )}
                {user.ist_demo ? <Badge variant="outline">Demo</Badge> : null}
                {user.gesperrt ? <Badge variant="destructive">Gesperrt</Badge> : null}
              </div>
            </button>

            {geoeffnet ? (
              <div className="flex flex-col gap-4 border-t p-4">
                {isBlankoRolle ? (
                  <p className="text-sm text-muted-foreground">
                    Träger-Admins haben automatisch Zugriff auf alle Einrichtungen und Bereiche, einschließlich Finanzen und
                    Einzelgehältern — eine individuelle Zuordnung ist nicht nötig.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {user.role === "einrichtungsleitung" ? (
                      <p className="text-xs text-muted-foreground">
                        Eine Einrichtungsleitung sieht und ändert standardmäßig alles außer Finanzübersicht und Einzelgehältern. Mit den
                        Schaltern lässt sich das je Einrichtung anpassen.
                      </p>
                    ) : null}
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Einrichtung</TableHead>
                          {BEREICHE.map((b) => (
                            <TableHead key={b.key} title={b.hinweis}>{b.label}</TableHead>
                          ))}
                          {istTraegerAdmin ? <TableHead>Lokaler Admin</TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {clusterGruppen.map((gruppe) => (
                          <Fragment key={gruppe.label}>
                            {clusterGruppen.length > 1 ? (
                              <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableCell colSpan={colSpanGesamt} className="text-xs font-semibold text-muted-foreground">
                                  {gruppe.label}
                                </TableCell>
                              </TableRow>
                            ) : null}
                            {gruppe.einrichtungen.length > 1 ? (
                              <ClusterBulkZeile
                                userId={user.id}
                                einrichtungenImCluster={gruppe.einrichtungen}
                                istTraegerAdmin={istTraegerAdmin}
                                eigeneZugriffe={eigeneZugriffe}
                                zeigeLokalerAdminSpalte={istTraegerAdmin}
                                aktuell={(einrichtungId, bereich) => zugriffFuer(user.id, einrichtungId, bereich, user.role)}
                              />
                            ) : null}
                            {gruppe.einrichtungen.map((einrichtung) => (
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
                                      <ZugriffSchalterGespeichert
                                        start={zugriffFuer(user.id, einrichtung.id, b.key, user.role)}
                                        maxRang={eigenerRang}
                                        label={`${b.label} bei ${einrichtung.name}`}
                                        speichern={(neu) => setEinrichtungBerechtigung(user.id, einrichtung.id, b.key, neu)}
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
                          </Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
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

                {istTraegerAdmin && user.id !== currentUserId && user.role !== "traeger_admin" ? (
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

/** Setzt einen Zugriffswert für alle Einrichtungen eines Clusters auf einmal, statt jede Zeile einzeln
 * durchzuklicken (Rückmeldung: bei mehreren Einrichtungen pro Cluster mühsam). Einrichtungen, für die der
 * gewählte Wert das eigene Niveau überschreiten würde, werden übersprungen statt einen Fehler zu zeigen —
 * gleiche Kappung wie das disabled-Verhalten der einzelnen ZugriffSelect-Dropdowns. */
function ClusterBulkZeile({
  userId,
  einrichtungenImCluster,
  istTraegerAdmin,
  eigeneZugriffe,
  zeigeLokalerAdminSpalte,
  aktuell,
}: {
  userId: string;
  einrichtungenImCluster: MatrixEinrichtung[];
  istTraegerAdmin: boolean;
  eigeneZugriffe: Record<string, Record<Bereich, Zugriff>>;
  zeigeLokalerAdminSpalte: boolean;
  /** Aktueller Wert einer Einrichtung/eines Bereichs — dient als Anzeige, wenn alle Einrichtungen des Clusters gleich stehen. */
  aktuell: (einrichtungId: string, bereich: Bereich) => Zugriff;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [angezeigt, setAngezeigt] = useState<Partial<Record<Bereich, Zugriff>>>({});

  const gemeinsamerWert = (bereich: Bereich): Zugriff => {
    if (angezeigt[bereich]) return angezeigt[bereich] as Zugriff;
    const werte = einrichtungenImCluster.map((e) => aktuell(e.id, bereich));
    return werte.every((w) => w === werte[0]) ? werte[0] : "kein_zugriff";
  };
  const hoechsterRang = (bereich: Bereich) =>
    istTraegerAdmin
      ? 2
      : Math.max(
          ...einrichtungenImCluster.map(
            (e) => ZUGRIFF_OPTIONS.find((o) => o.value === (eigeneZugriffe[e.id]?.[bereich] ?? "kein_zugriff"))?.rang ?? 0
          )
        );

  return (
    <>
      <TableRow className="bg-secondary/20 hover:bg-secondary/20">
        <TableCell className="text-xs text-muted-foreground">Für ganzes Cluster setzen</TableCell>
        {BEREICHE.map((b) => (
          <TableCell key={b.key}>
            <ZugriffSchalter
              wert={gemeinsamerWert(b.key)}
              maxRang={hoechsterRang(b.key)}
              disabled={isPending}
              label={`${b.label} für das ganze Cluster`}
              onChange={(neuerWert) => {
                const zielRang = ZUGRIFF_OPTIONS.find((o) => o.value === neuerWert)?.rang ?? 0;
                setError(null);
                setAngezeigt((alt) => ({ ...alt, [b.key]: neuerWert }));
                startTransition(async () => {
                  for (const einrichtung of einrichtungenImCluster) {
                    const eigenerRang = istTraegerAdmin
                      ? 2
                      : ZUGRIFF_OPTIONS.find((o) => o.value === (eigeneZugriffe[einrichtung.id]?.[b.key] ?? "kein_zugriff"))?.rang ?? 0;
                    // Einrichtungen, in denen der Vergebende selbst weniger hat, werden übersprungen statt einen Fehler zu zeigen.
                    if (zielRang > eigenerRang) continue;
                    try {
                      const ergebnis = await setEinrichtungBerechtigung(userId, einrichtung.id, b.key, neuerWert);
                      if (!ergebnis.ok) setError(ergebnis.error);
                    } catch {
                      setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
                    }
                  }
                  router.refresh();
                });
              }}
            />
          </TableCell>
        ))}
        {zeigeLokalerAdminSpalte ? <TableCell /> : null}
      </TableRow>
      {error ? (
        <TableRow className="bg-secondary/20 hover:bg-secondary/20">
          <TableCell colSpan={1 + BEREICHE.length + (zeigeLokalerAdminSpalte ? 1 : 0)}>
            <span className="text-xs text-destructive">{error}</span>
          </TableCell>
        </TableRow>
      ) : null}
    </>
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
      <Switch
        defaultChecked={wert}
        disabled={isPending}
        onCheckedChange={(neuerWert) => {
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
        <Switch
          defaultChecked={wert}
          disabled={isPending}
          onCheckedChange={(neuerWert) => {
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
            if (
              neu === "traeger_admin" &&
              !window.confirm(
                `${name} wirklich zum Träger-Admin machen? Ein Träger-Admin hat vollen Zugriff, verwaltet Nutzer und lässt sich über diese Seite nicht mehr herabstufen, sperren oder löschen.`
              )
            ) {
              e.target.value = rolle;
              return;
            }
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
