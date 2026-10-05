import Link from "next/link";
import { UserMinus, Baby } from "lucide-react";
import { parseIsoDate } from "@/lib/kita-datum";
import { monatLang, type AusblickErgebnis } from "@/lib/ausblick/personal-ausblick";
import { PersonalAusblickChart, type AusblickPunkt } from "@/components/dashboard/personal-ausblick-chart";

function monatKurz(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Der Verlauf von vorhandenem Personal gegen den Bedarf über die nächsten Monate, plus die Ereignisse, die ihn verändern.
 * Der Befund selbst („ab wann fehlt wie viel“) steht in der Handlungsliste — hier nur die Kurve und was dahintersteckt. */
export function PersonalVerlauf({ ausblick: a }: { ausblick: AusblickErgebnis }) {
  if (a.monate.length === 0) return null;
  const daten: AusblickPunkt[] = a.monate.map((m) => ({
    label: monatKurz(m.monat),
    ist: Math.round(m.istStunden * 10) / 10,
    bedarf: Math.round(m.bedarfStunden * 10) / 10,
    luecke: Math.round(Math.max(0, m.bedarfStunden - m.istStunden) * 10) / 10,
  }));
  const kritisch = a.ersterEngpass ?? a.ersteWarnung;

  return (
    <section className="flex flex-col gap-4 rounded-2xl border bg-card p-4 md:p-5" aria-labelledby="verlauf-titel">
      <div className="flex flex-col gap-1">
        <h2 id="verlauf-titel" className="font-heading text-lg text-primary">
          Personal im Verlauf
        </h2>
        <p className="text-xs text-muted-foreground">{a.satz.text}</p>
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

      {a.ereignisse.length > 0 ? (
        <ul className="flex flex-col gap-1.5 text-sm">
          {a.ereignisse.slice(0, 5).map((e, i) => {
            const Icon = e.typ === "austritt" ? UserMinus : Baby;
            return (
              <li key={`${e.monat}-${e.typ}-${i}`} className="flex items-center gap-2 text-muted-foreground">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                <span className="w-28 shrink-0 tabular-nums text-foreground">{monatLang(e.monat)}</span>
                <span>{e.text}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {kritisch && a.empfehlungen.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-secondary/50 p-4 text-sm">
          {a.empfehlungen.map((e) => (
            <p key={e}>{e}</p>
          ))}
          <Link href="/szenario" className="self-start text-primary underline-offset-2 hover:underline">
            Im Szenario-Rechner durchspielen →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
