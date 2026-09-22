"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fuegeNotizHinzu } from "@/lib/actions/kinder";

export type NotizEintrag = {
  id: string;
  text: string;
  erstellt_von_name: string | null;
  erstellt_am: string;
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Historischer Notizen-Verlauf: jeder Eintrag bleibt dauerhaft sichtbar, nichts wird überschrieben — löst das
 * frühere, einzelne Notizen-Feld ab. Nur Nutzer mit Belegungs-Schreibrecht können neue Einträge hinzufügen. */
export function NotizenVerlauf({
  kindId,
  eintraege,
  canEdit,
}: {
  kindId: string;
  eintraege: NotizEintrag[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-lg text-primary">Notizen</h2>

      {canEdit ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setError(null);
            startTransition(async () => {
              try {
                const ergebnis = await fuegeNotizHinzu(kindId, text);
                if (!ergebnis.ok) {
                  setError(ergebnis.error);
                  return;
                }
                setText("");
                router.refresh();
              } catch {
                setError("Die Verbindung ist abgebrochen. Bitte erneut versuchen.");
              }
            });
          }}
        >
          <Textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Neue Notiz hinzufügen…"
            maxLength={2000}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pending || text.trim().length === 0} className="self-start">
              {pending ? "Speichert…" : "Notiz hinzufügen"}
            </Button>
            {error ? <span className="text-xs text-destructive">{error}</span> : null}
          </div>
        </form>
      ) : null}

      {eintraege.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Notizen vorhanden.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {eintraege.map((eintrag) => (
            <li key={eintrag.id} className="rounded-lg border p-3 text-sm break-inside-avoid">
              <p className="whitespace-pre-line">{eintrag.text}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatTimestamp(eintrag.erstellt_am)} — {eintrag.erstellt_von_name ?? "Unbekannt"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
