"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

/** Fragt den 6-stelligen Code der Authenticator-App ab und hebt die Sitzung auf die zweite Sicherheitsstufe. */
export function MfaCodeForm({ weiter }: { weiter: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const supabase = createClient();
        const { data: faktoren } = await supabase.auth.mfa.listFactors();
        const faktor = faktoren?.totp?.[0];
        if (!faktor) {
          setPending(false);
          setError("Es ist kein Zwei-Faktor-Gerät eingerichtet.");
          return;
        }
        const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: faktor.id });
        if (challengeError || !challenge) {
          setPending(false);
          setError("Die Abfrage konnte nicht gestartet werden. Bitte versuche es erneut.");
          return;
        }
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: faktor.id,
          challengeId: challenge.id,
          code: code.trim(),
        });
        setPending(false);
        if (verifyError) {
          setError("Der Code ist falsch oder abgelaufen.");
          return;
        }
        router.push(weiter);
        router.refresh();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="mfa-code">Code aus der Authenticator-App</Label>
        <Input
          id="mfa-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          required
          autoFocus
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={pending || code.length !== 6}>
        {pending ? "Prüfen…" : "Bestätigen"}
      </Button>
    </form>
  );
}
