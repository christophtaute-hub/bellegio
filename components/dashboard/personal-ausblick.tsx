import Link from "next/link";
import { CalendarClock, CheckCircle2, TriangleAlert, OctagonAlert, UserMinus, Baby } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString, parseIsoDate } from "@/lib/kita-datum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { berechnePersonalAusblick, monatLang, type AusblickAustritt, type AusblickErgebnis } from "@/lib/ausblick/personal-ausblick";
import { PersonalAusblickChart, type AusblickPunkt } from "@/components/dashboard/personal-ausblick-chart";
import { StatTile } from "@/components/ui/stat-tile";
import { cn } from "cn";

/** Monatsabstände, für die zusätzlich zum fortlaufenden Diagramm ein kompakter
 * Meilenstein-Wert gezeigt wird — 0-indexiert ab dem aktuellen Monat. */
const MEILENSTEIN_OFFSETS = [3, 6, 12] as const;

const AUSBLICK_MONATE = 18;

const MODELL_LABEL = {
  bayern: "Anstellungsschlüssel nach BayKiBiG",
  bw: "Personalschlüssel nach KiTaVO",
  nrw: "Personalstunden nach KiBiz",
} as const;

function monatKurz(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}

function formatStunden(value: number): string {
  return (Math.round(value * 10) / 10).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function PersonalAusblickSkeleton() {
  return <div className="h-72 animate-pulse rounded-2xl border bg-secondary/30" aria-hidden="true" />;
}

const TON = {
  ok: { icon: CheckCircle2, klasse: "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-400" },
  warnung: { icon: TriangleAlert, klasse: "border-amber-400/50 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-400" },
  engpass: { icon: OctagonAlert, klasse: "border-destructive/30 bg-destructive/5 text-destructive" },
} as const;

async function ladeAusblick(
  einrichtungId: string
): Promise<{ ausblick: AusblickErgebnis; daten: AusblickPunkt[] } | "leer" | "fehler"> {
  try {
    const supabase = await createClient();
    const heute = new Date();
    const start = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));

    const [months, { data: einrichtung }, { data: team }] = await Promise.all([
      buildForecastMonths(supabase, einrichtungId, start, AUSBLICK_MONATE),
      supabase.from("einrichtungen").select("vollzeit_wochenstunden").eq("id", einrichtungId).single(),
      supabase
        .from("team")
        .select("vorname, nachname, austritt, wochenstunden")
        .eq("einrichtung_id", einrichtungId)
        .eq("status", "aktiv")
        .is("archived_at", null)
        .not("austritt", "is", null)
        .gte("austritt", start),
    ]);
    if (months.length === 0) return "leer";

    const austritte: AusblickAustritt[] = (team ?? []).map((t) => ({
      name: [t.vorname, t.nachname].filter(Boolean).join(" "),
      austritt: t.austritt as string,
      wochenstunden: Number(t.wochenstunden ?? 0),
    }));
    const ausblick = berechnePersonalAusblick(months, Number(einrichtung?.vollzeit_wochenstunden ?? 39), austritte);
    const daten = ausblick.monate.map((m) => ({
      label: monatKurz(m.monat),
      ist: Math.round(m.istStunden * 10) / 10,
      bedarf: Math.round(m.bedarfStunden * 10) / 10,
      luecke: Math.round(Math.max(0, m.bedarfStunden - m.istStunden) * 10) / 10,
    }));
    return { ausblick, daten };
  } catch {
    // Ein Fehler beim Berechnen darf nicht das ganze Dashboard ersetzen.
    return "fehler";
  }
}

/** Der Blick nach vorn: Reicht das Personal in den nächsten Monaten? Ein Satz in Klartext, der Verlauf von
 * Personal und Bedarf in Wochenstunden und die Ereignisse, die etwas verändern. Rechnet je Bundesland im
 * eigenen Modell; die Fachbegriffe stehen nur als kleine Zeile darunter. */
export async function PersonalAusblick({ einrichtungId }: { einrichtungId: string }) {
  const ergebnis = await ladeAusblick(einrichtungId);
  if (ergebnis === "leer") return null;
  if (ergebnis === "fehler") {
    return (
      <section className="rounded-2xl border bg-secondary/30 p-5 text-sm text-muted-foreground">
        Der Personal-Ausblick ist gerade nicht verfügbar. Lade die Seite bitte neu; die übrigen Zahlen sind davon nicht betroffen.
      </section>
    );
  }

  const { ausblick: a, daten } = ergebnis;
  const ton = TON[a.satz.ton];
  const Icon = ton.icon;
  const kritisch = a.ersterEngpass ?? a.ersteWarnung;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <CalendarClock className="size-4" />
        </div>
        <div>
          <h2 className="font-heading text-lg leading-tight text-primary">Personal-Ausblick</h2>
          <p className="text-xs text-muted-foreground">Reicht dein Personal? Die nächsten {AUSBLICK_MONATE} Monate.</p>
        </div>
      </div>

      <div className={cn("flex items-start gap-3 rounded-xl border p-4", ton.klasse)}>
        <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium">{a.satz.text}</p>
          {a.ursache ? <p className="text-sm text-foreground/80">{a.ursache}</p> : null}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <PersonalAusblickChart daten={daten} />
        <div className="flex flex-wrap gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 bg-primary" />Vorhandenes Personal</span>
          <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-foreground" />Bedarf</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-sm bg-destructive/40" />Es fehlen Stunden</span>
          <span>Wochenstunden je Monat</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {MEILENSTEIN_OFFSETS.map((offset) => {
          const m = a.monate[offset];
          if (!m) return null;
          return (
            <StatTile
              key={offset}
              label={`In ${offset} Monaten (${monatKurz(m.monat)})`}
              value={`${formatStunden(m.istStunden)} / ${formatStunden(m.bedarfStunden)} Std.`}
              tone={m.ampel === "gruen" ? "default" : "warn"}
            />
          );
        })}
      </div>

      {a.ereignisse.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">Was sich verändert</h3>
          <ul className="flex flex-col gap-1.5 text-sm">
            {a.ereignisse.slice(0, 6).map((e, i) => {
              const EIcon = e.typ === "austritt" ? UserMinus : Baby;
              return (
                <li key={`${e.monat}-${e.typ}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                  <EIcon className="size-3.5 shrink-0" aria-hidden />
                  <span className="w-28 shrink-0 tabular-nums text-foreground">{monatLang(e.monat)}</span>
                  <span>{e.text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {kritisch && a.empfehlungen.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm">
          <h3 className="font-medium">Was hilft?</h3>
          <ul className="flex flex-col gap-1">
            {a.empfehlungen.map((e) => (
              <li key={e} className="flex gap-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <Link href="/szenario" className="self-start text-primary underline-offset-2 hover:underline">
            Im Szenario-Rechner durchspielen →
          </Link>
        </div>
      ) : null}

      <p className="text-[11px] text-muted-foreground">
        Grundlage: {MODELL_LABEL[a.modell]}
        {kritisch ? ` — ${kritisch.detail}` : ""}
      </p>
    </section>
  );
}
