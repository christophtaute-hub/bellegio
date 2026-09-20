"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

type Einrichtung = { faktorId: string; qr: string; geheimnis: string };

/** Zwei-Faktor-Anmeldung mit Authenticator-App (TOTP). Empfohlen für Konten mit Zugriff auf die Abrechnung. */
export function MfaEinrichtung() {
  const [aktiverFaktor, setAktiverFaktor] = useState<string | null | undefined>(undefined);
  const [einrichtung, setEinrichtung] = useState<Einrichtung | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function laden() {
    const { data } = await createClient().auth.mfa.listFactors();
    setAktiverFaktor(data?.totp?.[0]?.id ?? null);
  }

  useEffect(() => {
    let aktiv = true;
    createClient()
      .auth.mfa.listFactors()
      .then(({ data }) => {
        if (aktiv) setAktiverFaktor(data?.totp?.[0]?.id ?? null);
      });
    return () => {
      aktiv = false;
    };
  }, []);

  async function starten() {
    setPending(true);
    setError(null);
    const supabase = createClient();
    // Unbestätigte Reste früherer Versuche entfernen, sonst lehnt Supabase gleichnamige Faktoren ab.
    const { data: alle } = await supabase.auth.mfa.listFactors();
    for (const f of (alle?.all ?? []).filter((x) => x.factor_type === "totp" && x.status === "unverified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Authenticator-App" });
    setPending(false);
    if (enrollError || !data) {
      setError("Die Einrichtung konnte nicht gestartet werden.");
      return;
    }
    setEinrichtung({ faktorId: data.id, qr: data.totp.qr_code, geheimnis: data.totp.secret });
  }

  async function bestaetigen() {
    if (!einrichtung) return;
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: einrichtung.faktorId });
    if (challengeError || !challenge) {
      setPending(false);
      setError("Die Abfrage konnte nicht gestartet werden.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: einrichtung.faktorId,
      challengeId: challenge.id,
      code: code.trim(),
    });
    setPending(false);
    if (verifyError) {
      setError("Der Code ist falsch oder abgelaufen.");
      return;
    }
    setEinrichtung(null);
    setCode("");
    await laden();
  }

  async function ausschalten() {
    if (!aktiverFaktor) return;
    setPending(true);
    setError(null);
    const { error: unenrollError } = await createClient().auth.mfa.unenroll({ factorId: aktiverFaktor });
    setPending(false);
    if (unenrollError) {
      setError("Das Ausschalten war nicht möglich. Bitte melde dich neu an und bestätige den Code.");
      return;
    }
    await laden();
  }

  if (aktiverFaktor === undefined) return <p className="text-sm text-muted-foreground">Wird geladen…</p>;

  return (
    <div className="flex max-w-md flex-col gap-3">
      <div>
        <h2 className="font-heading text-lg text-primary">Zwei-Faktor-Anmeldung</h2>
        <p className="text-sm text-muted-foreground">
          Beim Anmelden fragt Bellegio zusätzlich den Code einer Authenticator-App ab. Für den Zugang zur Abrechnung ist
          das ausdrücklich empfohlen.
        </p>
      </div>

      {aktiverFaktor ? (
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400">
            Aktiv
          </span>
          <Button variant="ghost" size="sm" className="text-destructive" disabled={pending} onClick={ausschalten}>
            Ausschalten
          </Button>
        </div>
      ) : einrichtung ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            Scanne den Code mit einer Authenticator-App (z. B. Google Authenticator, Microsoft Authenticator oder 1Password)
            und gib danach den 6-stelligen Code ein.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={einrichtung.qr} alt="QR-Code für die Authenticator-App" className="size-44 rounded-lg border bg-white p-2" />
          <p className="text-xs text-muted-foreground">
            Geht das Scannen nicht? Gib diesen Schlüssel von Hand ein: <span className="font-mono">{einrichtung.geheimnis}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mfa-einrichten-code">Code</Label>
            <Input
              id="mfa-einrichten-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || code.length !== 6} onClick={bestaetigen}>
              Aktivieren
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEinrichtung(null)}>
              Abbrechen
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" className="w-fit" disabled={pending} onClick={starten}>
          Zwei-Faktor einrichten
        </Button>
      )}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
