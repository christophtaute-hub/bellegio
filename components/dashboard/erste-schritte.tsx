import Link from "next/link";
import { Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canWriteBelegung, canWritePersonal, getCurrentUserRole } from "@/lib/server/current-user-role";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

type Schritt = {
  titel: string;
  beschreibung: string;
  erledigt: boolean;
  aktionen: { href: string; label: string; primaer?: boolean }[];
  hinweis?: string;
};

/** Zeigt neuen, noch leeren Einrichtungen den Weg zur ersten Auswertung. Verschwindet, sobald
 * Gruppen, Personal und Kinder vorhanden sind. */
export async function ErsteSchritte({ einrichtungId }: { einrichtungId: string }) {
  const supabase = await createClient();
  const [gruppen, team, kinder, darfBelegung, darfPersonal, rolle] = await Promise.all([
    supabase.from("gruppen").select("id", { count: "exact", head: true }).eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase.from("team").select("id", { count: "exact", head: true }).eq("einrichtung_id", einrichtungId).is("archived_at", null),
    supabase.from("kinder").select("id", { count: "exact", head: true }).eq("einrichtung_id", einrichtungId).is("archived_at", null),
    canWriteBelegung(supabase, einrichtungId),
    canWritePersonal(supabase, einrichtungId),
    getCurrentUserRole(),
  ]);

  const hatGruppen = (gruppen.count ?? 0) > 0;
  const hatTeam = (team.count ?? 0) > 0;
  const hatKinder = (kinder.count ?? 0) > 0;
  if (hatGruppen && hatTeam && hatKinder) return null;

  const istAdmin = rolle === "traeger_admin";
  let hatWeitereNutzer = true;
  if (istAdmin) {
    const { count } = await supabase.from("user_profiles").select("id", { count: "exact", head: true });
    hatWeitereNutzer = (count ?? 0) > 1;
  }

  const schritte: Schritt[] = [
    {
      titel: "Gruppen anlegen",
      beschreibung: "Name, Gruppenart, Sollplätze — in BW und NRW auch Betriebsform bzw. Gruppenform, damit der Personalbedarf stimmt.",
      erledigt: hatGruppen,
      aktionen: darfBelegung ? [{ href: "/gruppen/neu", label: "Gruppe anlegen", primaer: true }] : [],
      hinweis: darfBelegung ? undefined : "Das machen Personen mit Bearbeitungsrecht für die Belegung.",
    },
    {
      titel: "Personal erfassen",
      beschreibung: "Wochenstunden und Kategorie (Fachkraft, Ergänzungskraft …) bestimmen den Personalschlüssel.",
      erledigt: hatTeam,
      aktionen: darfPersonal
        ? [
            { href: "/team/import", label: "Aus Excel importieren", primaer: true },
            { href: "/team/neu", label: "Einzeln anlegen" },
          ]
        : [],
      hinweis: darfPersonal ? undefined : "Das machen Personen mit Bearbeitungsrecht für das Personal.",
    },
    {
      titel: "Kinder erfassen",
      beschreibung: "Aktive Kinder mit Gruppe und Eintritt, Nachrücker mit geplantem Eintritt.",
      erledigt: hatKinder,
      aktionen:
        darfBelegung && hatGruppen
          ? [
              { href: "/kinder/import", label: "Aus Excel importieren", primaer: true },
              { href: "/kinder/neu", label: "Einzeln anlegen" },
            ]
          : [],
      hinweis: !hatGruppen ? "Lege zuerst mindestens eine Gruppe an." : darfBelegung ? undefined : "Das machen Personen mit Bearbeitungsrecht für die Belegung.",
    },
    ...(istAdmin
      ? [
          {
            titel: "Kolleginnen und Kollegen einladen",
            beschreibung: "Lege fest, wer welchen Bereich sehen und bearbeiten darf.",
            erledigt: hatWeitereNutzer,
            aktionen: [{ href: "/einstellungen", label: "Nutzer & Rechte", primaer: false }],
          } satisfies Schritt,
        ]
      : []),
  ];

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-lg text-primary">Erste Schritte</h2>
        <p className="text-sm text-muted-foreground">
          So kommst du zu deiner ersten Auswertung. Sobald Gruppen, Personal und Kinder erfasst sind, verschwindet
          diese Liste.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {schritte.map((schritt, index) => (
          <li key={schritt.titel} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                schritt.erledigt ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
              aria-hidden
            >
              {schritt.erledigt ? <Check className="size-3.5" /> : index + 1}
            </span>
            <div className="flex flex-1 flex-col gap-1.5">
              <p className={cn("text-sm font-medium", schritt.erledigt && "text-muted-foreground line-through")}>
                {schritt.titel}
                {schritt.erledigt ? <span className="sr-only"> (erledigt)</span> : null}
              </p>
              {!schritt.erledigt ? (
                <>
                  <p className="text-sm text-muted-foreground">{schritt.beschreibung}</p>
                  {schritt.hinweis ? <p className="text-xs text-muted-foreground">{schritt.hinweis}</p> : null}
                  {schritt.aktionen.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {schritt.aktionen.map((a) => (
                        <Link
                          key={a.href}
                          href={a.href}
                          className={buttonVariants({ size: "sm", variant: a.primaer ? "default" : "secondary" })}
                        >
                          {a.label}
                        </Link>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
