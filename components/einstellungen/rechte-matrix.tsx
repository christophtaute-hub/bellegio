"use client";

import { useState, useTransition } from "react";
import {
  setEinrichtungBerechtigung,
  setKannRechteVerwalten,
} from "@/lib/actions/berechtigungen";
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
};

export type MatrixEinrichtung = { id: string; name: string };

export type BerechtigungRow = {
  user_id: string;
  einrichtung_id: string;
  bereich: string;
  zugriff: string;
};

export function RechteMatrix({
  currentUserId,
  istTraegerAdmin,
  einrichtungen,
  users,
  berechtigungen,
  eigeneZugriffe,
}: {
  currentUserId: string;
  istTraegerAdmin: boolean;
  einrichtungen: MatrixEinrichtung[];
  users: MatrixUser[];
  berechtigungen: BerechtigungRow[];
  eigeneZugriffe: Record<string, Record<Bereich, Zugriff>>;
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

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
              await setEinrichtungBerechtigung(userId, einrichtungId, bereich, neuerWert);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
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
              await setKannRechteVerwalten(userId, neuerWert);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Fehler beim Speichern.");
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
