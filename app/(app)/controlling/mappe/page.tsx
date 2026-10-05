import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { PLANUNGSHILFE_HINWEIS, RECHENWERTE_STAND } from "@/lib/constants";
import { canViewControlling, canViewFinanzen } from "@/lib/server/current-user-role";
import { addMonthsUtc, formatDate, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import { loeseZeitraumAuf, zeitraumEnde, zeitraumMonate, type ZeitraumParameter } from "@/lib/controlling/zeitraum";
import { buildForecastMonths } from "@/lib/forecast/monthly-forecast";
import { getKategorisierung } from "@/lib/controlling/jahreskategorisierung";
import { ForecastTable } from "@/components/forecast/forecast-table";
import { KalenderjahrKategorisierungTabelle } from "@/components/forecast/kalenderjahr-kategorisierung-tabelle";
import { MappeExportButtons, type AuditMonat } from "@/components/controlling/mappe-export-buttons";
import { ZeitraumAuswahl } from "@/components/forecast/zeitraum-auswahl";
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

export default async function PruefungsmappePage({
  searchParams,
}: {
  searchParams: Promise<ZeitraumParameter>;
}) {
  const parameter = await searchParams;
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
  const kitajahrBeginnMonat = einrichtung?.kita_year_start_month ?? 9;
  const zeitraumWahl = loeseZeitraumAuf(parameter, kitajahrBeginnMonat, heute);
  const vonMonat = zeitraumWahl.von;
  const anzahl = zeitraumWahl.monate;
  const bisMonatsende = zeitraumEnde(zeitraumWahl);

  const [months, kategorisierung, { data: auditRows }] = await Promise.all([
    buildForecastMonths(supabase, einrichtungId, vonMonat, anzahl, zeigeFinanzen),
    getKategorisierung(supabase, einrichtungId, zeitraumMonate(zeitraumWahl)),
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
          <MappeExportButtons months={months} kategorisierung={{ label: zeitraumWahl.label, monate: kategorisierung }} audit={audit} meta={meta} zeigeFinanzen={zeigeFinanzen} />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Alles Wesentliche zu Belegung, Personal und Meldewesen in einem Dokument — für Aufsicht, Jugendamt und Träger.
          Als PDF speichern oder als Excel mit allen Tabellen exportieren.
        </p>
        <ZeitraumAuswahl
          basePath="/controlling/mappe"
          art={zeitraumWahl.art}
          jahr={zeitraumWahl.jahr}
          bisJahr={zeitraumWahl.bisJahr}
          kitajahrBeginnMonat={kitajahrBeginnMonat}
          aktuellesJahr={heute.getUTCFullYear()}
          beschreibung={`${zeitraumWahl.label}: ${zeitraum}`}
        />
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
        <h2 className="font-heading text-xl text-primary">2. Kategorisierung nach Wochenstunden ({zeitraumWahl.label})</h2>
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
