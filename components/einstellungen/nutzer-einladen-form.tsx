"use client";

import { useState } from "react";
import { inviteUser } from "@/lib/actions/berechtigungen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NutzerEinladenForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        setErfolg(null);
        try {
          await inviteUser(email, name);
          setErfolg(`Einladung an ${email} verschickt.`);
          setEmail("");
          setName("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Einladung fehlgeschlagen.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-name" className="text-xs text-muted-foreground">
          Name
        </label>
        <Input
          id="invite-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Vor- und Nachname"
          className="h-8 w-48"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="invite-email" className="text-xs text-muted-foreground">
          E-Mail
        </label>
        <Input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@beispiel.de"
          className="h-8 w-64"
        />
      </div>
      <Button type="submit" size="sm" disabled={isSaving}>
        {isSaving ? "Wird eingeladen…" : "Nutzer einladen"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {erfolg ? <p className="text-xs text-primary">{erfolg}</p> : null}
    </form>
  );
}
