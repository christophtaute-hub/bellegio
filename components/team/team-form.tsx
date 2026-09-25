"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createTeamMitglied,
  updateTeamMitglied,
  type TeamInput,
} from "@/lib/actions/team";
import { upsertTeamVerguetung } from "@/lib/actions/team-verguetung";
import { TEAM_ROLLE_OPTIONS, TEAM_ROLE_CATEGORY_LABEL, TVOED_SUE_ENTGELTGRUPPEN } from "@/lib/constants";
import { meldeFehler } from "@/lib/toast";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const teamFormSchema = z
  .object({
    vorname: z.string().min(1, "Pflichtfeld"),
    nachname: z.string().min(1, "Pflichtfeld"),
    rolle: z.string().min(1, "Pflichtfeld"),
    gruppe_id: z.string(),
    wochenstunden: z.string(),
    role_category: z.enum([
      "fk",
      "ek",
      "ak",
      "nicht_paed",
      "sprachfoerderung",
      "hausmeister",
      "hauswirtschaft",
    ]),
    status: z.enum(["aktiv", "inaktiv", "geplant"]),
    eintritt: z.string(),
    austritt: z.string(),
    entgeltgruppe: z.string().optional(),
    stufe: z.string().optional(),
    monatsgehalt_manuell: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.wochenstunden ||
      (Number(data.wochenstunden) > 0 && Number(data.wochenstunden) <= 60),
    {
      message: "Bitte eine gültige Wochenstundenzahl angeben.",
      path: ["wochenstunden"],
    }
  );

type TeamFormValues = z.infer<typeof teamFormSchema>;

export type TeamFormOption = { id: string; label: string };

export function TeamForm({
  mode,
  teamId,
  einrichtungId,
  defaultValues,
  gruppen,
  canViewFinanzen = false,
  canWriteFinanzen = false,
}: {
  mode: "create" | "edit";
  teamId?: string;
  /** Nur für mode="edit" gebraucht (Vergütung speichern) — im Formular selbst nie angezeigt. */
  einrichtungId?: string;
  defaultValues?: Partial<TeamFormValues>;
  gruppen: TeamFormOption[];
  /** Vergütungs-Abschnitt: nur sichtbar mit Finanzen-Zugriff, nur editierbar mit
   * Finanzen-Bearbeiten-Recht. Bewusst nur in mode="edit" nutzbar — beim Anlegen (mode="create")
   * leitet der Server nach dem Speichern sofort weiter, ein Vergütungs-Eintrag käme dort ohnehin nie
   * an (siehe lib/actions/team-verguetung.ts). */
  canViewFinanzen?: boolean;
  canWriteFinanzen?: boolean;
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      vorname: "",
      nachname: "",
      rolle: TEAM_ROLLE_OPTIONS[0],
      gruppe_id: "",
      wochenstunden: "",
      role_category: "ek",
      status: "geplant",
      eintritt: "",
      austritt: "",
      entgeltgruppe: "",
      stufe: "",
      monatsgehalt_manuell: "",
      ...defaultValues,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const input: TeamInput = {
      vorname: values.vorname,
      nachname: values.nachname,
      rolle: values.rolle,
      gruppe_id: values.gruppe_id || null,
      wochenstunden: values.wochenstunden ? Number(values.wochenstunden) : null,
      role_category: values.role_category,
      status: values.status,
      eintritt: values.eintritt || null,
      austritt: values.austritt || null,
    };

    try {
      if (mode === "create") {
        await createTeamMitglied(input);
      } else if (teamId) {
        // upsertTeamVerguetung muss VOR updateTeamMitglied laufen: updateTeamMitglied leitet am
        // Ende per redirect() weiter, danach ist der Rest dieser Funktion unerreichbar.
        if (canWriteFinanzen && einrichtungId) {
          await upsertTeamVerguetung(teamId, einrichtungId, {
            entgeltgruppe: values.entgeltgruppe || null,
            stufe: values.stufe ? Number(values.stufe) : null,
            monatsgehaltManuell: values.monatsgehalt_manuell ? Number(values.monatsgehalt_manuell) : null,
          });
        }
        await updateTeamMitglied(teamId, input);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== "NEXT_REDIRECT") {
        setSubmitError(error.message);
        meldeFehler(error.message);
      } else if (!(error instanceof Error)) {
        throw error;
      }
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="vorname" label="Vorname" error={errors.vorname?.message}>
          <Input id="vorname" {...register("vorname")} />
        </Field>
        <Field id="nachname" label="Nachname" error={errors.nachname?.message}>
          <Input id="nachname" {...register("nachname")} />
        </Field>
        <Field id="rolle" label="Rolle" error={errors.rolle?.message}>
          <select id="rolle" className={SELECT_CLASS} {...register("rolle")}>
            {TEAM_ROLLE_OPTIONS.map((rolle) => (
              <option key={rolle} value={rolle}>
                {rolle}
              </option>
            ))}
          </select>
        </Field>
        <Field id="gruppe_id" label="Gruppe">
          <select
            id="gruppe_id"
            className={SELECT_CLASS}
            {...register("gruppe_id")}
          >
            <option value="">Keine</option>
            {gruppen.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </Field>
        <Field
          id="wochenstunden"
          label="Wochenstunden"
          error={errors.wochenstunden?.message}
        >
          <Input
            id="wochenstunden"
            type="number"
            step="0.5"
            min="0"
            max="60"
            {...register("wochenstunden")}
          />
        </Field>
        <Field id="status" label="Status">
          <select id="status" className={SELECT_CLASS} {...register("status")}>
            <option value="geplant">Geplant</option>
            <option value="aktiv">Aktiv</option>
            <option value="inaktiv">Inaktiv</option>
          </select>
        </Field>
        <Field id="role_category" label="Kategorie (für den Anstellungsschlüssel)">
          <select
            id="role_category"
            className={SELECT_CLASS}
            {...register("role_category")}
          >
            {Object.entries(TEAM_ROLE_CATEGORY_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="eintritt" label="Eintritt">
          <Input id="eintritt" type="date" {...register("eintritt")} />
        </Field>
        <Field id="austritt" label="Austritt">
          <Input id="austritt" type="date" {...register("austritt")} />
        </Field>
      </div>

      {mode === "edit" && canViewFinanzen ? (
        <div className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-4">
          <h3 className="text-sm font-medium">Vergütung</h3>
          <p className="text-xs text-muted-foreground">
            TVöD SuE (Entgeltgruppe/Stufe) oder ein manuelles Monatsgehalt — ein gesetztes manuelles
            Gehalt hat immer Vorrang vor der Tabelle. Teilzeit wird automatisch anteilig gerechnet.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="entgeltgruppe" label="Entgeltgruppe (TVöD SuE)">
              <select id="entgeltgruppe" className={SELECT_CLASS} disabled={!canWriteFinanzen} {...register("entgeltgruppe")}>
                <option value="">Keine Angabe</option>
                {TVOED_SUE_ENTGELTGRUPPEN.map((gruppe) => (
                  <option key={gruppe} value={gruppe}>
                    {gruppe}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="stufe" label="Stufe">
              <select id="stufe" className={SELECT_CLASS} disabled={!canWriteFinanzen} {...register("stufe")}>
                <option value="">Keine Angabe</option>
                {[1, 2, 3, 4, 5, 6].map((stufe) => (
                  <option key={stufe} value={stufe}>
                    {stufe}
                  </option>
                ))}
              </select>
            </Field>
            <Field id="monatsgehalt_manuell" label="Manuelles Monatsgehalt (Vollzeit, €)">
              <Input
                id="monatsgehalt_manuell"
                type="number"
                step="0.01"
                min="0"
                disabled={!canWriteFinanzen}
                placeholder="ersetzt die TVöD-Tabelle, wenn gesetzt"
                {...register("monatsgehalt_manuell")}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? "Speichern…"
          : mode === "create"
            ? "Personal anlegen"
            : "Änderungen speichern"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  children,
}: {
  id?: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
