"use client";

import { useState } from "react";
import { updateEigenenNamen } from "@/lib/actions/profil";
import { createClient } from "@/lib/supabase/client";
import { pruefePasswort } from "@/lib/passwort";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MeinProfilForm({
  initialFullName,
  email,
}: {
  initialFullName: string;
  email: string;
}) {
  const [fullName, setFullName] = useState(initialFullName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameErfolg, setNameErfolg] = useState<string | null>(null);

  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordErfolg, setPasswordErfolg] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setIsSavingName(true);
          setNameError(null);
          setNameErfolg(null);
          try {
            await updateEigenenNamen(fullName);
            setNameErfolg("Gespeichert.");
          } catch (err) {
            setNameError(err instanceof Error ? err.message : "Fehler beim Speichern.");
          } finally {
            setIsSavingName(false);
          }
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profil-email">E-Mail</Label>
          <Input id="profil-email" value={email} disabled className="w-80" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profil-name">Name</Label>
          <Input
            id="profil-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            className="w-80"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isSavingName} className="self-start">
            {isSavingName ? "Speichern…" : "Namen speichern"}
          </Button>
          {nameErfolg ? <span className="text-xs text-primary">{nameErfolg}</span> : null}
        </div>
        {nameError ? <p className="text-xs text-destructive">{nameError}</p> : null}
      </form>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (event) => {
          event.preventDefault();
          setPasswordError(null);
          setPasswordErfolg(null);

          const passwortFehler = pruefePasswort(password);
          if (passwortFehler) {
            setPasswordError(passwortFehler);
            return;
          }
          if (password !== passwordRepeat) {
            setPasswordError("Die Passwörter stimmen nicht überein.");
            return;
          }

          setIsSavingPassword(true);
          const supabase = createClient();
          const { error } = await supabase.auth.updateUser({ password });
          setIsSavingPassword(false);

          if (error) {
            setPasswordError(error.message);
            return;
          }
          setPassword("");
          setPasswordRepeat("");
          setPasswordErfolg("Passwort geändert.");
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profil-passwort">Neues Passwort</Label>
          <Input
            id="profil-passwort"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-80"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profil-passwort-wdh">Passwort wiederholen</Label>
          <Input
            id="profil-passwort-wdh"
            type="password"
            autoComplete="new-password"
            value={passwordRepeat}
            onChange={(event) => setPasswordRepeat(event.target.value)}
            className="w-80"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={isSavingPassword} className="self-start">
            {isSavingPassword ? "Speichern…" : "Passwort ändern"}
          </Button>
          {passwordErfolg ? <span className="text-xs text-primary">{passwordErfolg}</span> : null}
        </div>
        {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
      </form>
    </div>
  );
}
