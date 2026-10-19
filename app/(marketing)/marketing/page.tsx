import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { toIsoDateString } from "@/lib/kita-datum";
import { ladeKampagnen } from "@/lib/marketing/lade-kampagnen";
import { ladeMarketingEinstellungen } from "@/lib/marketing/einstellungen";
import { STATUS_LABEL, STATUS_REIHENFOLGE, type KampagneStatus } from "@/lib/marketing/kampagne";
import { FARBE_LABEL, type AmpelFarbe, type MarketingAmpelArt } from "@/lib/marketing/ampel";
import { baueZeilen, ermittleHinweise, filtereZeilen, kennzahlen, type BewertungDaten, type Filter } from "@/lib/marketing/uebersicht";
import { AmpelPunkte } from "@/components/marketing/ampel-punkte";
import { FilterLeiste } from "@/components/marketing/filter-leiste";
import { MetricCard } from "@/components/ui/metric-card";
import { cn } from "cn";

const FOKUS = ["kritisch", "ohne_massnahme", "veraltet", "laufend"] as const;
const FARBEN: AmpelFarbe[] = ["rot", "orange", "gelb", "gruen"];
const datum = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString("de-DE", { timeZone: "UTC" }) : null);
const vor = (iso: string | null, heute: string) => {
  if (!iso) return "noch nie";
  const tage = Math.round((Date.parse(`${heute}T00:00:00Z`) - Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)) / 86_400_000);
  return tage <= 0 ? "heute" : tage === 1 ? "gestern" : `vor ${tage} Tagen`;
};
const SCHWERE_PUNKT = { 3: "bg-destructive", 2: "bg-orange-500", 1: "bg-amber-400" } as const;

/** Marketing-Dashboard: Wo brennt es (Kennzahlen, Hinweise)? Was läuft (Kampagnen)? Was als Nächstes (Hinweisliste)? */
export default async function MarketingDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const f = await searchParams;
  const heute = toIsoDateString(new Date());
  const supabase = await createClient();
  const [{ data: einrichtungen }, { data: nutzer }, { data: bewertungRows }, kampagnen, einstellungen] = await Promise.all([
    supabase.rpc("marketing_einrichtungen"),
    supabase.rpc("marketing_nutzer"),
    supabase.from("marketing_bewertung").select("*"),
    ladeKampagnen(supabase),
    ladeMarketingEinstellungen(supabase),
  ]);

  const nutzerName = new Map((nutzer ?? []).map((n) => [n.id, n.full_name ?? "Ohne Namen"]));
  const bewertungen: BewertungDaten[] = (bewertungRows ?? []).map((b) => ({
    einrichtungId: b.einrichtung_id,
    regionalleitungUserId: b.regionalleitung_user_id,
    stufen: {
      personalbedarf: b.ampel_personalbedarf,
      personelle_qualitaet: b.ampel_personelle_qualitaet,
      paedagogische_qualitaet: b.ampel_paedagogische_qualitaet,
      belegung: b.ampel_belegung,
    } as Record<MarketingAmpelArt, number | null>,
    bewertetAm: b.bewertet_am,
  }));
  const alle = baueZeilen(
    (einrichtungen ?? []).map((e) => ({ id: e.id, name: e.name, kostenstelle: e.kostenstelle, cluster: e.cluster, bundeslandCode: e.bundesland_code, ort: e.ort })),
    bewertungen,
    kampagnen,
    nutzerName
  );
  const hinweise = ermittleHinweise(alle, heute, einstellungen.fristen);
  const kz = kennzahlen(alle, hinweise);

  const filter: Filter = {
    bundesland: f.bundesland || undefined,
    cluster: f.cluster || undefined,
    regionalleitung: f.regionalleitung || undefined,
    q: f.q || undefined,
    farbe: FARBEN.includes(f.farbe as AmpelFarbe) ? (f.farbe as AmpelFarbe) : undefined,
    kampagne: STATUS_REIHENFOLGE.includes(f.kampagne as KampagneStatus) ? (f.kampagne as KampagneStatus) : undefined,
    fokus: FOKUS.find((x) => x === f.fokus),
  };
  const zeilen = filtereZeilen(alle, filter, hinweise);
  const sichtbareIds = new Set(zeilen.map((z) => z.einrichtung.id));
  const sichtbareHinweise = hinweise.filter((h) => sichtbareIds.has(h.einrichtungId));

  const bundeslaender = [...new Set(alle.map((z) => z.einrichtung.bundeslandCode))];
  const cluster = [...new Set(alle.map((z) => z.einrichtung.cluster).filter((c): c is string => Boolean(c)))].sort();
  const leitungen = [...new Map(alle.filter((z) => z.regionalleitungId).map((z) => [z.regionalleitungId as string, z.regionalleitung as string])).entries()];

  const kachel = (fokus: (typeof FOKUS)[number], label: string, wert: number, warn: boolean) => {
    const aktiv = filter.fokus === fokus;
    const params = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== "fokus") as [string, string][]);
    if (!aktiv) params.set("fokus", fokus);
    return (
      <Link key={fokus} href={`/marketing${params.size ? `?${params}` : ""}`} className={cn("rounded-2xl transition-shadow hover:shadow-md", aktiv && "ring-2 ring-primary")} scroll={false}>
        <MetricCard label={label} value={String(wert)} tone={warn && wert > 0 ? "warn" : "default"} />
      </Link>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Marketing-Ampel</h1>
        <p className="text-sm text-muted-foreground">{alle.length} Einrichtungen</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kachel("kritisch", "Kritische Einrichtungen", kz.kritisch, true)}
        {kachel("laufend", "Laufende Kampagnen", kz.laufendeKampagnen, false)}
        {kachel("ohne_massnahme", "Kritisch ohne Maßnahme", kz.ohneMassnahme, true)}
        {kachel("veraltet", "Bewertung veraltet", kz.veraltet, false)}
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-5" aria-labelledby="naechstes">
        <h2 id="naechstes" className="font-heading text-lg text-primary">
          Als Nächstes
        </h2>
        {sichtbareHinweise.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nichts Dringendes. 🎉</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y">
              {sichtbareHinweise.slice(0, 6).map((h) => (
                <HinweisZeile key={h.id} h={h} />
              ))}
            </ul>
            {sichtbareHinweise.length > 6 ? (
              <details className="text-sm">
                <summary className="cursor-pointer text-primary">{sichtbareHinweise.length - 6 === 1 ? "Ein weiterer Hinweis" : `Weitere ${sichtbareHinweise.length - 6} Hinweise`}</summary>
                <ul className="mt-2 flex flex-col divide-y">
                  {sichtbareHinweise.slice(6).map((h) => (
                    <HinweisZeile key={h.id} h={h} />
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </section>

      <FilterLeiste
        felder={[
          { name: "q", label: "Suche", optionen: [], text: true },
          { name: "bundesland", label: "Bundesland", optionen: bundeslaender.map((b) => ({ wert: b, label: BUNDESLAENDER.find((x) => x.code === b)?.label ?? b })) },
          { name: "cluster", label: "Cluster", optionen: cluster.map((c) => ({ wert: c, label: c })) },
          { name: "regionalleitung", label: "Regionalleitung", optionen: leitungen.map(([id, name]) => ({ wert: id, label: name })) },
          { name: "farbe", label: "Ampelfarbe", optionen: FARBEN.map((c) => ({ wert: c, label: FARBE_LABEL[c] })) },
          { name: "kampagne", label: "Kampagnenstatus", optionen: STATUS_REIHENFOLGE.map((s) => ({ wert: s, label: STATUS_LABEL[s] })) },
        ]}
      />

      {zeilen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Einrichtung passt zu diesem Filter.</p>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Kostenstelle</th>
                  <th className="px-3 py-2.5 font-medium">Einrichtung</th>
                  <th className="px-3 py-2.5 font-medium">Bundesland</th>
                  <th className="px-3 py-2.5 font-medium">Cluster</th>
                  <th className="px-3 py-2.5 font-medium">Regionalleitung</th>
                  <th className="px-3 py-2.5 font-medium" title="Personalbedarf · Personelle Qualität · Pädagogische Qualität · Belegung">
                    Ampeln
                  </th>
                  <th className="px-3 py-2.5 font-medium">Kampagnen</th>
                  <th className="px-3 py-2.5 font-medium">Stand</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z) => (
                  <tr key={z.einrichtung.id} className="border-b last:border-0 hover:bg-secondary/40">
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{z.einrichtung.kostenstelle ?? "–"}</td>
                    <td className="px-3 py-2.5 font-medium">
                      <Link href={`/marketing/einrichtungen/${z.einrichtung.id}`} className="text-primary hover:underline">
                        {z.einrichtung.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{BUNDESLAENDER.find((b) => b.code === z.einrichtung.bundeslandCode)?.label ?? z.einrichtung.bundeslandCode}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{z.einrichtung.cluster ?? "–"}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{z.regionalleitung ?? "–"}</td>
                    <td className="px-3 py-2.5">
                      <AmpelPunkte stufen={z.stufen} />
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      {z.aktiv > 0 ? (
                        <>
                          {z.aktiv} aktiv{z.naechstesEnde ? <span className="text-muted-foreground"> · endet {datum(z.naechstesEnde)}</span> : null}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{z.kampagnen.some((k) => k.status === "geplant") ? "geplant" : "keine"}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{vor(z.bewertetAm, heute)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="flex flex-col gap-3 md:hidden">
            {zeilen.map((z) => (
              <li key={z.einrichtung.id} className="flex flex-col gap-2 rounded-2xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/marketing/einrichtungen/${z.einrichtung.id}`} className="font-medium text-primary hover:underline">
                    {z.einrichtung.name}
                  </Link>
                  <span className="text-xs text-muted-foreground">{z.einrichtung.kostenstelle ?? ""}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {[BUNDESLAENDER.find((b) => b.code === z.einrichtung.bundeslandCode)?.label, z.einrichtung.cluster, z.regionalleitung].filter(Boolean).join(" · ")}
                </p>
                <AmpelPunkte stufen={z.stufen} beschriftet />
                <p className="text-xs text-muted-foreground">
                  {z.aktiv > 0 ? `${z.aktiv} Kampagne(n) aktiv${z.naechstesEnde ? `, endet ${datum(z.naechstesEnde)}` : ""}` : "Keine aktive Kampagne"} · bewertet {vor(z.bewertetAm, heute)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function HinweisZeile({ h }: { h: { id: string; einrichtungId: string; einrichtungName: string; schwere: 1 | 2 | 3; text: string } }) {
  return (
    <li className="flex items-start gap-3 py-2 text-sm">
      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", SCHWERE_PUNKT[h.schwere])} aria-hidden />
      <span className="min-w-0 flex-1">
        <Link href={`/marketing/einrichtungen/${h.einrichtungId}`} className="font-medium text-primary hover:underline">
          {h.einrichtungName}
        </Link>
        : {h.text}
      </span>
    </li>
  );
}
