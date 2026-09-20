import Link from "next/link";
import { Building2, Users, Baby, Clock, AlertTriangle, FilePen } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, toIsoDateString } from "@/lib/kita-datum";
import { formatEuro, type OperatorKennzahl } from "@/lib/admin/abrechnung";
import {
  berechneUmsatz,
  istDemoRechnung,
  jahresFenster,
  ladeRechnungenFuerKopf,
  letzteRechnungen,
  monatsFenster,
  monatsReihe,
  naechsteFaelligkeiten,
  summeEntwuerfe,
  veraenderungProzent,
  verschiebeMonat,
  formatMonat,
} from "@/lib/admin/einnahmen";
import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { EinnahmenChart } from "@/components/admin/einnahmen-chart";
import { UmsatzKarte } from "@/components/admin/umsatz-karte";
import { RechnungStatusBadge } from "@/components/admin/status-badge";

function href(monat: string, jahr: number): string {
  return `/admin?monat=${monat}&jahr=${jahr}`;
}

function monatLang(monat: string): string {
  const [j, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(j, m - 1, 1)).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function AbrechnungPage({
  searchParams,
}: {
  searchParams: Promise<{ monat?: string; jahr?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());
  const aktuellerMonat = heute.slice(0, 7);
  const aktuellesJahr = Number(heute.slice(0, 4));

  const monat = /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.monat ?? "") && (sp.monat as string) <= aktuellerMonat ? (sp.monat as string) : aktuellerMonat;
  const jahrParam = Number(sp.jahr);
  const jahr = Number.isInteger(jahrParam) && jahrParam >= 2024 && jahrParam <= aktuellesJahr ? jahrParam : aktuellesJahr;

  const [rechnungen, { data: kennzahlen }, { data: einstellungen }] = await Promise.all([
    ladeRechnungenFuerKopf(supabase),
    supabase.rpc("operator_kennzahlen", { p_stichtag: heute }),
    supabase.from("betreiber_einstellungen").select("firmenname, anschrift").eq("id", true).single(),
  ]);

  const monatKz = berechneUmsatz(rechnungen, monatsFenster(monat), heute);
  const monatVorher = berechneUmsatz(rechnungen, monatsFenster(verschiebeMonat(monat, -1)), heute);
  const jahrKz = berechneUmsatz(rechnungen, jahresFenster(jahr), heute);
  const jahrVorher = berechneUmsatz(rechnungen, jahresFenster(jahr - 1), heute);
  const gesamt = berechneUmsatz(rechnungen, null, heute);
  const entwuerfe = summeEntwuerfe(rechnungen);

  const chartDaten = monatsReihe(rechnungen, jahr, heute).map((p) => ({
    label: formatMonat(p.monat).split(" ")[0],
    bezahlt: p.bezahlt,
    offen: p.offen,
    erwartet: p.erwartet,
  }));
  const letzte = letzteRechnungen(rechnungen, 5);
  const faellig = naechsteFaelligkeiten(rechnungen, 5);
  const demoAnzahl = rechnungen.filter(istDemoRechnung).length;

  const kunden = (kennzahlen ?? []) as OperatorKennzahl[];
  const traegerAnzahl = new Set(kunden.map((k) => k.trager_id)).size;
  const einrichtungenAnzahl = kunden.filter((k) => k.einrichtung_id).length;
  const kinderAnzahl = kunden.reduce((s, k) => s + (k.aktive_kinder ?? 0), 0);
  const betreiberdatenFehlen = !einstellungen?.firmenname || !einstellungen?.anschrift;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Abrechnung</h1>
        <p className="text-sm text-muted-foreground">
          Deine Einnahmen — Umsatz netto nach Rechnungsdatum. Diese Seite sieht nur der Betreiber.
        </p>
      </div>

      {betreiberdatenFehlen ? (
        <div className="rounded-xl border border-accent bg-accent/10 p-4 text-sm">
          Bevor du die erste Rechnung freigeben kannst, fehlen noch deine{" "}
          <Link href="/admin/einstellungen" className="text-primary underline underline-offset-2">
            Betreiberdaten
          </Link>{" "}
          (Firmenname, Anschrift, Bankverbindung).
        </div>
      ) : null}

      {demoAnzahl > 0 ? (
        <div className="rounded-xl border bg-secondary/40 p-4 text-sm text-muted-foreground">
          Die Zahlen enthalten {demoAnzahl} Demo-Rechnungen (Nummer „DEMO-…“). Vor dem Livegang löschen, sonst sind die
          Einnahmen nicht echt.
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UmsatzKarte
          eyebrow="Monat"
          titel={monatLang(monat)}
          kennzahlen={monatKz}
          veraenderung={veraenderungProzent(monatKz.umsatz, monatVorher.umsatz)}
          vergleichLabel="zum Vormonat"
          zurueckHref={href(verschiebeMonat(monat, -1), jahr)}
          weiterHref={monat < aktuellerMonat ? href(verschiebeMonat(monat, 1), jahr) : null}
        />
        <UmsatzKarte
          eyebrow="Jahr"
          titel={String(jahr)}
          kennzahlen={jahrKz}
          veraenderung={veraenderungProzent(jahrKz.umsatz, jahrVorher.umsatz)}
          vergleichLabel="zum Vorjahr"
          zurueckHref={href(monat, jahr - 1)}
          weiterHref={jahr < aktuellesJahr ? href(monat, jahr + 1) : null}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Umsatz seit Start" value={formatEuro(gesamt.umsatz)} />
        <MetricCard label="Offen gesamt" value={formatEuro(gesamt.offen)} icon={<Clock />} />
        <MetricCard
          label="Überfällig gesamt"
          value={formatEuro(gesamt.ueberfaellig)}
          icon={<AlertTriangle />}
          tone={gesamt.ueberfaellig > 0 ? "warn" : "default"}
        />
        <MetricCard label="Entwürfe (erwartet)" value={formatEuro(entwuerfe)} icon={<FilePen />} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Umsatz je Monat {jahr}</h2>
        {rechnungen.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Rechnungen. Lege unter{" "}
            <Link href="/admin/rechnungen/neu" className="text-primary underline underline-offset-2">
              Rechnungen
            </Link>{" "}
            die erste an.
          </p>
        ) : (
          <EinnahmenChart daten={chartDaten} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ListeKarte titel="Letzte Rechnungen" leer="Noch keine freigegebenen Rechnungen.">
          {letzte.map((r) => (
            <RechnungsZeile key={r.id} r={r} rechts={formatEuro(r.nettoSumme)} untertitel={`${r.tragerName} · ${formatDate(r.rechnungsdatum)}`} />
          ))}
        </ListeKarte>
        <ListeKarte titel="Als Nächstes fällig" leer="Keine offenen Rechnungen.">
          {faellig.map((r) => (
            <RechnungsZeile
              key={r.id}
              r={r}
              rechts={formatEuro(r.nettoSumme)}
              untertitel={`${r.tragerName} · fällig ${formatDate(r.faelligAm)}${(r.faelligAm as string) < heute ? " — überfällig" : ""}`}
            />
          ))}
        </ListeKarte>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Kunden (Träger)" value={String(traegerAnzahl)} icon={<Users />} />
        <MetricCard label="Einrichtungen" value={String(einrichtungenAnzahl)} icon={<Building2 />} />
        <MetricCard label="Aktive Kinder heute" value={String(kinderAnzahl)} icon={<Baby />} />
      </div>
    </div>
  );
}

function ListeKarte({ titel, leer, children }: { titel: string; leer: string; children: React.ReactNode[] }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
      <h2 className="font-heading text-base text-primary">{titel}</h2>
      {children.length === 0 ? (
        <p className="text-sm text-muted-foreground">{leer}</p>
      ) : (
        <ul className="flex flex-col divide-y">{children}</ul>
      )}
    </section>
  );
}

function RechnungsZeile({
  r,
  rechts,
  untertitel,
}: {
  r: { id: string; nummer: string | null; status: string };
  rechts: string;
  untertitel: string;
}) {
  return (
    <li className="flex items-center gap-3 py-2 text-sm">
      <div className="flex min-w-0 flex-1 flex-col">
        <Link href={`/admin/rechnungen/${r.id}`} className="flex items-center gap-2 font-medium underline-offset-2 hover:underline">
          {r.nummer ?? "Entwurf"}
          {istDemoRechnung(r) ? <Badge variant="outline">Demo</Badge> : null}
        </Link>
        <span className="truncate text-xs text-muted-foreground">{untertitel}</span>
      </div>
      <RechnungStatusBadge status={r.status} />
      <span className="w-24 text-right tabular-nums">{rechts}</span>
    </li>
  );
}
