"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  createTeamMitglied,
  updateTeamMitglied,
  type TeamInput,
} from "@/lib/actions/team";
import { TEAM_ROLLE_OPTIONS } from "@/lib/constants";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const teamFormSchema = z
  .object({
    vorname: z.string().min(1, "Pflichtfeld"),
    nachname: z.string().min(1, "Pflichtfeld"),
    rolle: z.string().min(1, "Pflichtfeld"),
    gruppe_id: z.string(),
    wochenstunden: z.string(),
    fachkraft: z.boolean(),
    status: z.enum(["aktiv", "inaktiv", "geplant"]),
    eintritt: z.string(),
    austritt: z.string(),
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
  defaultValues,
  gruppen,
}: {
  mode: "create" | "edit";
  teamId?: string;
  defaultValues?: Partial<TeamFormValues>;
  gruppen: TeamFormOption[];
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      vorname: "",
      nachname: "",
      rolle: TEAM_ROLLE_OPTIONS[0],
      gruppe_id: "",
      wochenstunden: "",
      fachkraft: false,
      status: "geplant",
      eintritt: "",
      austritt: "",
      ...defaultValues,
    },
  });

  const fachkraft = watch("fachkraft");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const input: TeamInput = {
      vorname: values.vorname,
      nachname: values.nachname,
      rolle: values.rolle,
      gruppe_id: values.gruppe_id || null,
      wochenstunden: values.wochenstunden ? Number(values.wochenstunden) : null,
      fachkraft: values.fachkraft,
      status: values.status,
      eintritt: values.eintritt || null,
      austritt: values.austritt || null,
    };

    try {
      if (mode === "create") {
        await createTeamMitglied(input);
      } else if (teamId) {
        await updateTeamMitglied(teamId, input);
      }
    } catch (error) {
      if (error instanceof Error && error.message !== "NEXT_REDIRECT") {
        setSubmitError(error.message);
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
        <Field id="eintritt" label="Eintritt">
          <Input id="eintritt" type="date" {...register("eintritt")} />
        </Field>
        <Field id="austritt" label="Austritt">
          <Input id="austritt" type="date" {...register("austritt")} />
        </Field>
      </div>

      <label htmlFor="fachkraft" className="flex items-center gap-2 text-sm">
        <Checkbox
          id="fachkraft"
          checked={fachkraft}
          onCheckedChange={(checked) =>
            setValue("fachkraft", checked === true, { shouldValidate: true })
          }
        />
        Pädagogische Fachkraft (zählt für die Fachkraftquote)
      </label>

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
