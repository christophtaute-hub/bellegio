"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function PasswortVergessenForm() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gesendet, setGesendet] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/passwort-setzen`,
    });
    setIsSubmitting(false);

    // Nur echte Zustellungsprobleme (z.B. Mail-Limit) melden. Ob die Adresse
    // existiert, bleibt unsichtbar — die Antwort ist immer dieselbe.
    if (resetError && resetError.status === 429) {
      setError("Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.");
      return;
    }
    setGesendet(true);
  };

  if (gesendet) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm">
          Wenn zu dieser E-Mail-Adresse ein Konto existiert, haben wir dir einen Link zum
          Zurücksetzen geschickt. Öffne ihn bitte im selben Browser, in dem du diese Seite
          gerade geöffnet hast.
        </p>
        <Link href="/login" className="text-sm text-primary underline-offset-4 hover:underline">
          Zurück zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? "Senden…" : "Link zum Zurücksetzen senden"}
      </Button>
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:text-foreground">
        Zurück zur Anmeldung
      </Link>
    </form>
  );
}
