import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { PLANUNGSHILFE_HINWEIS, RECHENWERTE_STAND } from "@/lib/constants";
import { canViewControlling, canViewFinanzen } from "@/lib/server/current-user-role";
import { addMonthsUtc, formatDate, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { getKalenderjahrKategorisierung } from "@/lib/controlling/jahreskategorisierung";
import { ForecastTable } from "@/components/forecast/forecast-table";
import { KalenderjahrKategorisierungTabelle } from "@/components/forecast/kalenderjahr-kategorisierung-tabelle";
import { MappeExportButtons, type AuditMonat } from "@/components/controlling/mappe-export-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const BUNDESLAND_LABEL: Record<string, string> = {
  by: "Bayern",
  bw: "Baden-Württemberg",
  nrw: "Nordrhein-Westfalen",
};
const RECHENWEG: Record<string, string> = {
  by: "Anstellungsschlüssel nach § 17 AVBayKiBiG (gewichtete Kinderzahl ÷ VZÄ, Höchstwert 1 : 11,0)",
  bw: "Mindestpersonalschlüssel nach § 1 KiTaVO (VZÄ-Sollwert je Betriebsform und Öffnungszeit)",
  nrw: "Personalstunden nach KiBiz (Fachkraft-/Ergänzungskraft-Stunden je Gruppenform und Buchungszeit)",
};

function kitajahrStart(heute: Date, startMonat: number): Date {
  const aktuellerMonat = heute.getUTCMonth() + 1;
  const jahr = aktuellerMonat >= startMonat ? heute.getUTCFullYear() : heute.getUTCFullYear() - 1;
  return new Date(Date.UTC(jahr, startMonat - 1, 1));
}

export default async function PruefungsmappePage({
  searchParams,
}: {
  searchParams: Promise<{ von?: string; monate?: string }>;
}) {
  const { von, monate } = await searchParams;
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const erlaubt = einrichtungId ? await canViewControlling(supabase, einrichtungId) : false;
  const zeigeFinanzen = einrichtungId ? await canViewFinanzen(supabase, einrichtungId) : false;
  if (!einrichtungId || !erlaubt) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Prüfungsmappe</h1>
        <p className="text-sm text-muted-foreground">Für diesen Bereich hast du keinen Zugriff auf die aktuelle Einrichtung.</p>
      </div>
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: einrichtung }, { data: profil }] = await Promise.all([
    supabase
      .from("einrichtungen")
      .select("name, address_street, address_zip, address_city, bundesland_code, kita_year_start_month, trager(name)")
      .eq("id", einrichtungId)
      .single(),
    user ? supabase.from("user_profiles").select("full_name").eq("id", user.id).single() : Promise.resolve({ data: null }),
  ]);

  const heute = new Date();
  const standardStart = toIsoDateString(kitajahrStart(heute, einrichtung?.kita_year_start_month ?? 9));
  const vonMonat = /^\d{4}-\d{2}(-\d{2})?$/.test(von ?? "") ? `${(von as string).slice(0, 7)}-01` : standardStart;
  const anzahl = Math.min(24, Math.max(1, Number(monate) || 12));
  const bisMonat = toIsoDateString(addMonthsUtc(parseIsoDate(vonMonat), anzahl - 1));
  const bisMonatsende = toIsoDateString(new Date(Date.UTC(Number(bisMonat.slice(0, 4)), Number(bisMonat.slice(5, 7)), 0)));
  const jahr = Number(vonMonat.slice(0, 4));

  const [months, kategorisierung, { data: auditRows }] = await Promise.all([
    buildForecastMonths(supabase, einrichtungId, vonMonat, anzahl, zeigeFinanzen),
    getKalenderjahrKategorisierung(supabase, einrichtungId, jahr),
    supabase.rpc("audit_zusammenfassung", { p_einrichtung_id: einrichtungId, p_von: vonMonat, p_bis: bisMonatsende }),
  ]);

  const audit: AuditMonat[] = Array.from({ length: anzahl }, (_, i) => {
    const monat = toIsoDateString(addMonthsUtc(parseIsoDate(vonMonat), i));
    const zeilen = (auditRows ?? []).filter((r) => r.monat === monat);
    return {
      monat: parseIsoDate(monat).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }),
      kinder: zeilen.find((r) => r.bereich === "kinder")?.anzahl ?? 0,
      personal: zeilen.find((r) => r.bereich === "personal")?.anzahl ?? 0,
    };
  });

  const bundesland = BUNDESLAND_LABEL[einrichtung?.bundesland_code ?? "by"] ?? "";
  const zeitraum = `${formatDate(vonMonat)} – ${formatDate(bisMonatsende)}`;
  const anschrift = [einrichtung?.address_street, [einrichtung?.address_zip, einrichtung?.address_city].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const meta = {
    einrichtung: einrichtung?.name ?? "",
    anschrift,
    bundesland,
    zeitraum,
    erstelltAm: formatDate(toIsoDateString(heute)),
    erstelltVon: profil?.full_name ?? user?.email ?? "",
  };
  const tragerName = (einrichtung?.trager as unknown as { name: string } | null)?.name;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3 print:hidden">
        <Link href="/controlling" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Controlling
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-heading text-3xl tracking-tight text-primary">Prüfungsmappe</h1>
          <MappeExportButtons months={months} kategorisierung={{ jahr, monate: kategorisierung }} audit={audit} meta={meta} zeigeFinanzen={zeigeFinanzen} />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Alles Wesentliche zu Belegung, Personal und Meldewesen in einem Dokument — für Aufsicht, Jugendamt und Träger.
          Als PDF speichern oder als Excel mit allen Tabellen exportieren.
        </p>
        <form className="flex flex-wrap items-end gap-3" method="get">
          <div className="flex flex-col gap-1">
            <label htmlFor="von" className="text-xs text-muted-foreground">Von (Monat)</label>
            <Input id="von" name="von" type="month" defaultValue={vonMonat.slice(0, 7)} className="h-8 w-40" />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="monate" className="text-xs text-muted-foreground">Monate</label>
            <Input id="monate" name="monate" type="number" min={1} max={24} defaultValue={anzahl} className="h-8 w-24" />
          </div>
          <Button type="submit" variant="secondary" size="sm">Anzeigen</Button>
        </form>
      </div>

      <section className="flex flex-col gap-6 rounded-2xl border bg-card p-10 print:min-h-[85vh] print:break-after-page print:justify-center print:rounded-none print:border-0">
        <p className="text-sm tracking-wide text-primary uppercase">Bellegio · Prüfungsmappe</p>
        <h2 className="font-heading text-5xl leading-tight font-semibold tracking-tight">{meta.einrichtung}</h2>
        <dl className="grid max-w-xl grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
          {[
            ["Träger", tragerName ?? "–"],
            ["Anschrift", anschrift || "–"],
            ["Bundesland", bundesland],
            ["Zeitraum", zeitraum],
            ["Erstellt am", meta.erstelltAm],
            ["Erstellt von", meta.erstelltVon || "–"],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="max-w-xl text-sm text-muted-foreground">
          Berechnungsgrundlage: {RECHENWEG[einrichtung?.bundesland_code ?? "by"]}. Die Zahlen entsprechen dem
          Datenstand zum Erstellungszeitpunkt; Quellen und Formeln stehen in der Dokumentation der Anwendung.
        </p>
      </section>

      <section className="flex flex-col gap-3 print:break-after-page">
        <h2 className="font-heading text-xl text-primary">1. Belegung und Personal je Monat</h2>
        <ForecastTable months={months} zeigeFinanzen={zeigeFinanzen} />
      </section>

      <section className="flex flex-col gap-3 print:break-after-page">
        <h2 className="font-heading text-xl text-primary">2. Kategorisierung nach Wochenstunden {jahr}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Kinder je Wochenstunden-Band, Stichtag jeweils der Erste des Monats; der 1. März ist der amtliche
          Erhebungsstichtag der Kinder- und Jugendhilfestatistik.
        </p>
        <KalenderjahrKategorisierungTabelle monate={kategorisierung} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-xl text-primary">3. Änderungsprotokoll (Zusammenfassung)</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Anzahl der protokollierten Änderungen an Kindern und Personal je Monat. Jede einzelne Änderung ist mit
          Zeitpunkt und Nutzer im Verlauf des jeweiligen Kindes bzw. Teammitglieds nachvollziehbar.
        </p>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Monat</TableHead>
                <TableHead className="text-right">Änderungen Kinder</TableHead>
                <TableHead className="text-right">Änderungen Personal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.map((a) => (
                <TableRow key={a.monat}>
                  <TableCell className="font-medium">{a.monat}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.kinder}</TableCell>
                  <TableCell className="text-right tabular-nums">{a.personal}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <p className="text-xs text-muted-foreground">
        Formatspezifische Exporte für die Landesportale folgen, sobald die jeweiligen Formate geklärt sind.
      </p>
      <p className="border-t pt-3 text-xs text-muted-foreground">
        Stand der Rechenwerte: {RECHENWERTE_STAND}. {PLANUNGSHILFE_HINWEIS}
      </p>
    </div>
  );
}
