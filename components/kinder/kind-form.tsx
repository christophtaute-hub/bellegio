"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { createKind, updateKind, type KindInput } from "@/lib/actions/kinder";
import { GESCHLECHT_LABEL } from "@/lib/constants";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const kindFormSchema = z
  .object({
    vorname: z.string().min(1, "Pflichtfeld"),
    nachname: z.string().min(1, "Pflichtfeld"),
    geburtsdatum: z.string().min(1, "Pflichtfeld"),
    geschlecht: z.enum(["maennlich", "weiblich", "divers", "keine_angabe"]),
    status: z.enum(["aktiv", "nachruecker", "geplant"]),
    gruppe_id: z.string(),
    platznummer: z.string(),
    eintritt: z.string(),
    austritt: z.string(),
    buchungszeit_band_id: z.string(),
    notizen: z.string(),
    weighting_factor_ids: z.array(z.string()),
  })
  .refine((data) => data.status !== "aktiv" || data.gruppe_id !== "", {
    message: "Aktive Kinder benötigen eine Gruppe.",
    path: ["gruppe_id"],
  });

type KindFormValues = z.infer<typeof kindFormSchema>;

export type KindFormOption = { id: string; label: string };

export function KindForm({
  mode,
  kindId,
  defaultValues,
  gruppen,
  bookingTimeBands,
  weightingFactors,
}: {
  mode: "create" | "edit";
  kindId?: string;
  defaultValues?: Partial<KindFormValues>;
  gruppen: KindFormOption[];
  bookingTimeBands: KindFormOption[];
  weightingFactors: KindFormOption[];
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<KindFormValues>({
    resolver: zodResolver(kindFormSchema),
    defaultValues: {
      vorname: "",
      nachname: "",
      geburtsdatum: "",
      geschlecht: "keine_angabe",
      status: "geplant",
      gruppe_id: "",
      platznummer: "",
      eintritt: "",
      austritt: "",
      buchungszeit_band_id: "",
      notizen: "",
      weighting_factor_ids: [],
      ...defaultValues,
    },
  });

  const selectedWeightingFactors = watch("weighting_factor_ids");

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const input: KindInput = {
      vorname: values.vorname,
      nachname: values.nachname,
      geburtsdatum: values.geburtsdatum,
      geschlecht: values.geschlecht,
      status: values.status,
      gruppe_id: values.gruppe_id || null,
      platznummer: values.platznummer || null,
      eintritt: values.eintritt || null,
      austritt: values.austritt || null,
      buchungszeit_band_id: values.buchungszeit_band_id || null,
      notizen: values.notizen || null,
      weighting_factor_ids: values.weighting_factor_ids,
    };

    try {
      if (mode === "create") {
        await createKind(input);
      } else if (kindId) {
        await updateKind(kindId, input);
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
        <Field
          id="geburtsdatum"
          label="Geburtsdatum"
          error={errors.geburtsdatum?.message}
        >
          <Input id="geburtsdatum" type="date" {...register("geburtsdatum")} />
        </Field>
        <Field id="geschlecht" label="Geschlecht">
          <select
            id="geschlecht"
            className={SELECT_CLASS}
            {...register("geschlecht")}
          >
            {Object.entries(GESCHLECHT_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field id="status" label="Status">
          <select id="status" className={SELECT_CLASS} {...register("status")}>
            <option value="geplant">Geplant</option>
            <option value="nachruecker">Nachrücker</option>
            <option value="aktiv">Aktiv</option>
          </select>
        </Field>
        <Field id="gruppe_id" label="Gruppe" error={errors.gruppe_id?.message}>
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
        <Field id="platznummer" label="Platznummer">
          <Input id="platznummer" {...register("platznummer")} />
        </Field>
        <Field id="eintritt" label="Eintritt">
          <Input id="eintritt" type="date" {...register("eintritt")} />
        </Field>
        <Field id="austritt" label="Austritt">
          <Input id="austritt" type="date" {...register("austritt")} />
        </Field>
        <Field id="buchungszeit_band_id" label="Buchungszeit">
          <select
            id="buchungszeit_band_id"
            className={SELECT_CLASS}
            {...register("buchungszeit_band_id")}
          >
            <option value="">–</option>
            {bookingTimeBands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Gewichtung">
        <div className="flex flex-col gap-2">
          {weightingFactors.map((factor) => (
            <label
              key={factor.id}
              htmlFor={`weighting-${factor.id}`}
              className="flex items-center gap-2 text-sm"
            >
              <Checkbox
                id={`weighting-${factor.id}`}
                checked={selectedWeightingFactors.includes(factor.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedWeightingFactors, factor.id]
                    : selectedWeightingFactors.filter((id) => id !== factor.id);
                  setValue("weighting_factor_ids", next, {
                    shouldValidate: true,
                  });
                }}
              />
              {factor.label}
            </label>
          ))}
        </div>
      </Field>

      <Field id="notizen" label="Notizen">
        <Textarea id="notizen" rows={4} {...register("notizen")} />
      </Field>

      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="self-start">
        {isSubmitting
          ? "Speichern…"
          : mode === "create"
            ? "Kind anlegen"
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
