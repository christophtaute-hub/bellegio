"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BASIS_FAKTOR, istBasisCode, leiteBasisfaktorAb } from "@/lib/kinder/basisfaktor";
import { createKind, updateKind, type KindInput } from "@/lib/actions/kinder";
import { meldeFehler } from "@/lib/toast";
import { GESCHLECHT_LABEL } from "@/lib/constants";
import { GruppenPassungHinweis } from "@/components/kinder/gruppen-passung-hinweis";
import { AuswaertigenHinweis } from "@/components/kinder/auswaertigen-hinweis";
import type { GruppeFuerPassung } from "@/lib/kinder/gruppen-passung";
import { toIsoDateString, vorgeschlagenerAustritt } from "@/lib/kita-datum";

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

const kindFormSchema = z
  .object({
    vorname: z.string().min(1, "Pflichtfeld"),
    nachname: z.string().min(1, "Pflichtfeld"),
    geburtsdatum: z.string().min(1, "Pflichtfeld"),
    geschlecht: z.enum(["", "maennlich", "weiblich", "divers", "keine_angabe"]),
    status: z.enum(["aktiv", "nachruecker", "geplant"]),
    gruppe_id: z.string(),
    eintritt: z.string(),
    austritt: z.string(),
    vertrag_gueltig_bis: z.string(),
    buchungszeit_band_id: z.string(),
    buchungszeit_wirksam_ab: z.string().min(1, "Bitte ein Datum angeben."),
    wohnort: z.string(),
    hat_behinderung: z.boolean(),
    i_status_von: z.string(),
    i_status_bis: z.string(),
    kooperation: z.boolean(),
    geschwister_nummer: z.string(),
    weighting_factor_ids: z.array(z.string()),
    ersetzt_kind_id: z.string(),
  })
  .refine((data) => data.geschlecht !== "", {
    message: "Bitte ein Geschlecht auswählen.",
    path: ["geschlecht"],
  })
  .refine((data) => !data.hat_behinderung || !data.i_status_von || !data.i_status_bis || data.i_status_bis >= data.i_status_von, {
    message: "„Gültig bis“ muss nach „gültig von“ liegen.",
    path: ["i_status_bis"],
  })
  .refine((data) => data.status !== "aktiv" || data.gruppe_id !== "", {
    message: "Aktive Kinder benötigen eine Gruppe.",
    path: ["gruppe_id"],
  })
  .refine((data) => data.status !== "aktiv" || data.eintritt !== "", {
    message: "Aktive Kinder brauchen ein Eintrittsdatum.",
    path: ["eintritt"],
  })
  .refine((data) => data.status !== "nachruecker" || data.eintritt !== "", {
    message: "Nachrücker brauchen ein geplantes Eintrittsdatum.",
    path: ["eintritt"],
  })
  .refine((data) => data.status !== "aktiv" || data.austritt !== "", {
    message: "Aktive Kinder brauchen ein Austrittsdatum.",
    path: ["austritt"],
  })
  .refine((data) => data.status !== "nachruecker" || data.austritt !== "", {
    message: "Nachrücker brauchen ein Austrittsdatum.",
    path: ["austritt"],
  });

type KindFormValues = z.infer<typeof kindFormSchema>;

export type KindFormOption = { id: string; label: string };
export type WeightingFactorOption = KindFormOption & { code: string };
export type AktivesKindOption = { id: string; vorname: string; nachname: string; gruppe_id: string };

export function KindForm({
  mode,
  kindId,
  defaultValues,
  gruppen,
  gruppenMitKindern,
  gruppenArtById,
  aktiveKinderZurAuswahl,
  bookingTimeBands,
  weightingFactors,
  bundeslandCode,
  zeigeGeschwister,
  auswaertigenQuote,
}: {
  mode: "create" | "edit";
  kindId?: string;
  defaultValues?: Partial<KindFormValues>;
  gruppen: KindFormOption[];
  gruppenMitKindern: GruppeFuerPassung[];
  /** gruppe_id → gruppenart, für den Krippe-Übergang-Hinweis. */
  gruppenArtById: Record<string, string>;
  /** Aktive Kinder je Gruppe, für die "Ersetzt"-Auswahl bei Nachrückern. */
  aktiveKinderZurAuswahl: AktivesKindOption[];
  bookingTimeBands: KindFormOption[];
  weightingFactors: WeightingFactorOption[];
  /** Steuert bundeslandspezifische Felder (Kooperation nur in Baden-Württemberg). */
  bundeslandCode?: string;
  /** Nur wenn die Einrichtung eine Geschwisterermäßigung hinterlegt hat. */
  zeigeGeschwister?: boolean;
  auswaertigenQuote?: {
    standortGemeinde: string;
    auswaertigenQuoteProzent: number;
    bestehendeWohnorte: (string | null)[];
  };
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
      geschlecht: "",
      status: "geplant",
      gruppe_id: "",
      eintritt: "",
      austritt: "",
      vertrag_gueltig_bis: "",
      buchungszeit_band_id: "",
      buchungszeit_wirksam_ab: toIsoDateString(new Date()),
      wohnort: "",
      hat_behinderung: false,
      i_status_von: "",
      i_status_bis: "",
      kooperation: false,
      geschwister_nummer: "1",
      weighting_factor_ids: [],
      ersetzt_kind_id: "",
      ...defaultValues,
    },
  });

  const selectedWeightingFactors = watch("weighting_factor_ids");
  const watchedStatus = watch("status");
  const watchedGeburtsdatum = watch("geburtsdatum");
  const watchedGeschlecht = watch("geschlecht");
  const watchedGruppeId = watch("gruppe_id");
  const watchedWohnort = watch("wohnort");
  const watchedAustritt = watch("austritt");

  // Vorschlägt ein Austrittsdatum, sobald ein Kind aktiv wird oder Nachrücker ist und noch keins gesetzt
  // ist — Krippenkinder zum 3., Kindergarten-Kinder zum 6. Geburtstag, auf den nächsten 1. September
  // gerundet (gleiche Heuristik wie der einmalige Backfill für bestehende Demo-Kinder, Milestone 31).
  // Greift nur, solange das Feld leer ist, überschreibt also nie eine bereits gesetzte oder gerade
  // manuell eingetragene Auswahl. Nachrücker haben oft noch keine Gruppe zugeordnet — ohne Gruppe wird
  // mangels besserer Information die Kindergarten-Heuristik (6. Geburtstag) angenommen.
  useEffect(() => {
    if ((watchedStatus !== "aktiv" && watchedStatus !== "nachruecker") || watchedAustritt || !watchedGeburtsdatum) return;
    const istKrippe = gruppenArtById[watchedGruppeId] === "krippe";
    setValue("austritt", vorgeschlagenerAustritt(watchedGeburtsdatum, istKrippe));
  }, [watchedStatus, watchedGruppeId, watchedGeburtsdatum, watchedAustritt, gruppenArtById, setValue]);
  // Bayern: der Basisfaktor (unter 3 / ab 3 Jahren) ergibt sich aus Geburtsdatum und Gruppe und wird nicht von Hand gesetzt.
  const basisfaktorAbgeleitet = weightingFactors.some((f) => f.code === "u3");
  const basisIds = new Set(weightingFactors.filter((f) => istBasisCode(f.code)).map((f) => f.id));
  const sichtbareFaktoren = basisfaktorAbgeleitet ? weightingFactors.filter((f) => !basisIds.has(f.id)) : weightingFactors;
  const abgeleiteterBasisfaktor =
    basisfaktorAbgeleitet && watchedGeburtsdatum
      ? BASIS_FAKTOR[
          leiteBasisfaktorAb({
            geburtsdatum: watchedGeburtsdatum,
            stichtag: toIsoDateString(new Date()),
            gruppenartBeiDrittemGeburtstag: gruppenArtById[watchedGruppeId] ?? null,
          })
        ]
      : null;
  const integrationsfaktorId = weightingFactors.find(
    (f) => f.code === "integrationskinder"
  )?.id;
  const kinderInGewaehlterGruppe = aktiveKinderZurAuswahl.filter(
    (k) => k.gruppe_id === watchedGruppeId && k.id !== kindId
  );

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const input: KindInput = {
      vorname: values.vorname,
      nachname: values.nachname,
      geburtsdatum: values.geburtsdatum,
      geschlecht: values.geschlecht as KindInput["geschlecht"],
      status: values.status,
      gruppe_id: values.gruppe_id || null,
      eintritt: values.eintritt || null,
      austritt: values.austritt || null,
      vertrag_gueltig_bis: values.vertrag_gueltig_bis || null,
      buchungszeit_band_id: values.buchungszeit_band_id || null,
      buchungszeit_wirksam_ab: values.buchungszeit_wirksam_ab || null,
      wohnort: values.wohnort || null,
      hat_behinderung: values.hat_behinderung,
      i_status_von: values.hat_behinderung ? values.i_status_von || null : null,
      i_status_bis: values.hat_behinderung ? values.i_status_bis || null : null,
      kooperation: values.kooperation,
      geschwister_nummer: Number(values.geschwister_nummer) || 1,
      weighting_factor_ids: basisfaktorAbgeleitet ? values.weighting_factor_ids.filter((id) => !basisIds.has(id)) : values.weighting_factor_ids,
      ersetzt_kind_id: values.status === "nachruecker" ? values.ersetzt_kind_id || null : null,
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
        <Field
          id="geburtsdatum"
          label="Geburtsdatum"
          error={errors.geburtsdatum?.message}
        >
          <Input id="geburtsdatum" type="date" {...register("geburtsdatum")} />
        </Field>
        <Field id="geschlecht" label="Geschlecht" error={errors.geschlecht?.message}>
          <select
            id="geschlecht"
            className={SELECT_CLASS}
            {...register("geschlecht")}
          >
            <option value="">Bitte wählen</option>
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
        <Field id="eintritt" label="Eintritt" error={errors.eintritt?.message}>
          <Input id="eintritt" type="date" {...register("eintritt")} />
        </Field>
        <Field id="austritt" label="Austritt" error={errors.austritt?.message}>
          <Input id="austritt" type="date" {...register("austritt")} />
          {watchedStatus === "aktiv" || watchedStatus === "nachruecker" ? (
            <p className="text-xs text-muted-foreground">
              Vorschlag automatisch berechnet (3./6. Geburtstag, 1. September) — bei Bedarf anpassen.
            </p>
          ) : null}
        </Field>
        <Field
          id="vertrag_gueltig_bis"
          label="Vertrag/Buchung gültig bis"
        >
          <Input
            id="vertrag_gueltig_bis"
            type="date"
            {...register("vertrag_gueltig_bis")}
          />
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
        <Field
          id="buchungszeit_wirksam_ab"
          label="Buchungszeit gültig ab"
          error={errors.buchungszeit_wirksam_ab?.message}
        >
          <Input
            id="buchungszeit_wirksam_ab"
            type="date"
            {...register("buchungszeit_wirksam_ab")}
          />
          <p className="text-xs text-muted-foreground">
            Nur wichtig, wenn sich die Buchungszeit ändert — frühere Stichtage zeigen dann weiterhin die alte Zeit.
          </p>
        </Field>
        <Field id="wohnort" label="Wohnort">
          <Input id="wohnort" {...register("wohnort")} />
        </Field>
      </div>

      {auswaertigenQuote ? (
        <AuswaertigenHinweis
          wohnort={watchedWohnort}
          standortGemeinde={auswaertigenQuote.standortGemeinde}
          auswaertigenQuoteProzent={auswaertigenQuote.auswaertigenQuoteProzent}
          bestehendeWohnorte={auswaertigenQuote.bestehendeWohnorte}
        />
      ) : null}

      {watchedStatus === "nachruecker" ? (
        <>
          <GruppenPassungHinweis
            geburtsdatum={watchedGeburtsdatum}
            geschlecht={watchedGeschlecht}
            ausgewaehlteGruppeId={watchedGruppeId}
            gruppen={gruppenMitKindern}
            onGruppeWaehlen={(gruppeId) =>
              setValue("gruppe_id", gruppeId, { shouldValidate: true })
            }
          />
          <Field id="ersetzt_kind_id" label="Ersetzt (optional)">
            <select id="ersetzt_kind_id" className={SELECT_CLASS} {...register("ersetzt_kind_id")}>
              <option value="">Kein bestimmtes Kind — noch offen</option>
              {kinderInGewaehlterGruppe.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.vorname} {k.nachname}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Wenn bekannt: das aktive Kind derselben Gruppe, dessen Platz dieser Nachrücker übernimmt — erscheint
              dann auf dessen Platznummer statt &bdquo;offen&ldquo;.
            </p>
          </Field>
        </>
      ) : null}

      <Field label="Gewichtung">
        <div className="flex flex-col gap-2">
          {basisfaktorAbgeleitet ? (
            <p className="rounded-xl bg-secondary/50 px-3 py-2 text-sm">
              <span className="font-medium">
                {abgeleiteterBasisfaktor
                  ? `${abgeleiteterBasisfaktor.label} (${abgeleiteterBasisfaktor.factor.toLocaleString("de-DE", { minimumFractionDigits: 1 })})`
                  : "Basisfaktor ergibt sich aus dem Geburtsdatum"}
              </span>
              <span className="block text-xs text-muted-foreground">
                Automatisch aus Geburtsdatum und Gruppe — in der Krippe gilt 2,0 bis zum Ende des Kindergartenjahres, in dem das Kind drei wird.
                Besondere Merkmale kannst du unten zusätzlich setzen.
              </span>
            </p>
          ) : null}
          {sichtbareFaktoren.map((factor) => (
            <label
              key={factor.id}
              htmlFor={`weighting-${factor.id}`}
              className="flex items-center gap-2 text-sm"
            >
              <Switch
                id={`weighting-${factor.id}`}
                checked={selectedWeightingFactors.includes(factor.id)}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedWeightingFactors, factor.id]
                    : selectedWeightingFactors.filter((id) => id !== factor.id);
                  setValue("weighting_factor_ids", next, {
                    shouldValidate: true,
                  });
                  if (checked && factor.id === integrationsfaktorId) {
                    setValue("hat_behinderung", true);
                  }
                }}
              />
              {factor.label}
            </label>
          ))}
        </div>
      </Field>

      <label htmlFor="hat_behinderung" className="flex items-center gap-2 text-sm">
        <Switch
          id="hat_behinderung"
          checked={watch("hat_behinderung")}
          onCheckedChange={(checked) => {
            setValue("hat_behinderung", checked === true);
            // Beim Einschalten sofort einen Beginn vorschlagen; beim Ausschalten den Zeitraum verwerfen
            if (checked === true && !watch("i_status_von")) setValue("i_status_von", toIsoDateString(new Date()));
            if (checked !== true) {
              setValue("i_status_von", "");
              setValue("i_status_bis", "");
            }
          }}
        />
        Kind mit I-Status — bundeslandunabhängig, z.B. für die jährliche
        Kinder- und Jugendhilfestatistik
      </label>
      {watch("hat_behinderung") ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl bg-secondary/50 p-3">
          <Field label="I-Status gültig von">
            <Input type="date" className="w-44" {...register("i_status_von")} />
          </Field>
          <Field label="gültig bis" error={errors.i_status_bis?.message}>
            <Input type="date" className="w-44" {...register("i_status_bis")} />
          </Field>
          <p className="max-w-xs pb-2 text-xs text-muted-foreground">
            Leer lassen, wenn der Zeitraum noch offen ist. Die Statistik zählt das Kind nur in Monaten, in denen der I-Status gilt.
          </p>
        </div>
      ) : null}

      {zeigeGeschwister ? (
        <Field id="geschwister_nummer" label="Platz in der Geschwisterreihe">
          <select id="geschwister_nummer" className={SELECT_CLASS} {...register("geschwister_nummer")}>
            <option value="1">Kein Geschwisterkind (voller Preis)</option>
            <option value="2">2. Kind der Familie</option>
            <option value="3">3. Kind der Familie</option>
            <option value="4">4. Kind oder weitere</option>
          </select>
        </Field>
      ) : null}

      {bundeslandCode === "bw" ? (
        <label htmlFor="kooperation" className="flex items-center gap-2 text-sm">
          <Switch id="kooperation" checked={watch("kooperation")} onCheckedChange={(checked) => setValue("kooperation", checked === true)} />
          Kooperation (Ja / Nein)
        </label>
      ) : null}

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
