"use client";

import { useState } from "react";
import {
  createAusfallzeit,
  deleteAusfallzeit,
  type AusfallzeitArt,
} from "@/lib/actions/team";
import { AUSFALLZEIT_ART_LABEL } from "@/lib/constants";
import { formatDate } from "@/lib/kita-datum";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

export type AusfallzeitRow = {
  id: string;
  art: string;
  von: string;
  bis: string | null;
  notizen: string | null;
};

export function AusfallzeitenListe({
  teamId,
  ausfallzeiten,
  canEdit,
}: {
  teamId: string;
  ausfallzeiten: AusfallzeitRow[];
  canEdit: boolean;
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [art, setArt] = useState<AusfallzeitArt>("krankheit");
  const [von, setVon] = useState("");
  const [bis, setBis] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-lg text-primary">Ausfallzeiten</h2>

      {ausfallzeiten.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {ausfallzeiten.map((az) => (
            <li
              key={az.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-secondary/40 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">
                  {AUSFALLZEIT_ART_LABEL[az.art] ?? az.art}
                </span>{" "}
                <span className="text-muted-foreground">
                  {formatDate(az.von)} – {az.bis ? formatDate(az.bis) : "offen"}
                </span>
                {az.notizen ? (
                  <span className="text-muted-foreground"> · {az.notizen}</span>
                ) : null}
              </span>
              {canEdit ? (
                <form action={deleteAusfallzeit.bind(null, az.id, teamId)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Entfernen
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          Keine Ausfallzeiten erfasst.
        </p>
      )}

      {canEdit ? (
        isFormOpen ? (
          <form
            className="flex flex-col gap-3 rounded-lg border p-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              if (!von) {
                setError("Bitte ein Startdatum angeben.");
                return;
              }
              setIsSubmitting(true);
              try {
                await createAusfallzeit(teamId, {
                  art,
                  von,
                  bis: bis || null,
                  notizen: null,
                });
                setIsFormOpen(false);
                setVon("");
                setBis("");
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Fehler beim Speichern."
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="art">Art</Label>
                <select
                  id="art"
                  className={SELECT_CLASS}
                  value={art}
                  onChange={(e) => setArt(e.target.value as AusfallzeitArt)}
                >
                  {Object.entries(AUSFALLZEIT_ART_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="von">Von</Label>
                <Input
                  id="von"
                  type="date"
                  value={von}
                  onChange={(e) => setVon(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bis">Bis (optional)</Label>
                <Input
                  id="bis"
                  type="date"
                  value={bis}
                  onChange={(e) => setBis(e.target.value)}
                />
              </div>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Speichern…" : "Erfassen"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsFormOpen(false)}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        ) : (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setIsFormOpen(true)}
          >
            Ausfallzeit erfassen
          </Button>
        )
      ) : null}
    </div>
  );
}
