"use client";

import { useState } from "react";
import { inviteUser } from "@/lib/actions/berechtigungen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

export function NutzerEinladenForm() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [passwortDirektVergeben, setPasswortDirektVergeben] = useState(false);
  const [passwort, setPasswort] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erfolg, setErfolg] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError(null);
        setErfolg(null);
        try {
          await inviteUser(
            email,
            name,
            passwortDirektVergeben ? passwort : undefined
          );
          setErfolg(
            passwortDirektVergeben
              ? `Account für ${email} angelegt — sofort mit dem vergebenen Passwort einsatzbereit.`
              : `Einladung an ${email} verschickt.`
          );
          setEmail("");
          setName("");
          setPasswort("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Nutzer konnte nicht angelegt werden.");
        } finally {
          setIsSaving(false);
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
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
        {passwortDirektVergeben ? (
          <div className="flex flex-col gap-1">
            <label htmlFor="invite-passwort" className="text-xs text-muted-foreground">
              Passwort
            </label>
            <Input
              id="invite-passwort"
              type="text"
              required
              minLength={6}
              value={passwort}
              onChange={(event) => setPasswort(event.target.value)}
              placeholder="mind. 6 Zeichen"
              className="h-8 w-48"
            />
          </div>
        ) : null}
        <Button type="submit" size="sm" disabled={isSaving}>
          {isSaving
            ? "Wird angelegt…"
            : passwortDirektVergeben
              ? "Nutzer mit Passwort anlegen"
              : "Nutzer einladen"}
        </Button>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <Checkbox
          checked={passwortDirektVergeben}
          onCheckedChange={(checked) => setPasswortDirektVergeben(checked === true)}
        />
        Passwort direkt vergeben, statt per E-Mail einzuladen
      </label>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {erfolg ? <p className="text-xs text-primary">{erfolg}</p> : null}
    </form>
  );
}
