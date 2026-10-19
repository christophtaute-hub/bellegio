import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { BUNDESLAENDER } from "@/lib/admin/neuer-kunde";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { ladeMarketingVorschlag } from "@/lib/marketing/lade-vorschlag";
import { beschreibeBewertungsAenderung } from "@/lib/marketing/protokoll";
import { BewertungForm, type BewertungWerte } from "@/components/marketing/bewertung-form";
import { Button } from "@/components/ui/button";

const text = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const wann = (iso: string) => new Date(iso).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

/** Einrichtungsansicht der Marketing-Ampel: Stammdaten (nur lesend), vier Ampeln mit Zusatzwerten, Verlauf. */
export default async function MarketingEinrichtungPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const [{ data: einrichtungen }, { data: nutzer }, zugriff] = await Promise.all([
    supabase.rpc("marketing_einrichtungen"),
    supabase.rpc("marketing_nutzer"),
    getMarketingZugriff(),
  ]);
  const einrichtung = (einrichtungen ?? []).find((e) => e.id === id);
  if (!einrichtung) notFound();

  const [{ data: b }, { data: protokoll }, vorschlag] = await Promise.all([
    supabase.from("marketing_bewertung").select("*").eq("einrichtung_id", id).maybeSingle(),
    supabase.from("marketing_protokoll").select("id, tabelle, aktion, alt, neu, geaendert_von, geaendert_am").eq("einrichtung_id", id).order("geaendert_am", { ascending: false }).limit(30),
    zugriff === "bearbeiten" ? ladeMarketingVorschlag(id) : Promise.resolve(null),
  ]);

  const nutzerName = new Map((nutzer ?? []).map((n) => [n.id, n.full_name ?? "Ohne Namen"]));
  const start: BewertungWerte = {
    regionalleitung: b?.regionalleitung_user_id ?? "",
    personalbedarf: b?.ampel_personalbedarf ?? null,
    personelleQualitaet: b?.ampel_personelle_qualitaet ?? null,
    paedagogischeQualitaet: b?.ampel_paedagogische_qualitaet ?? null,
    belegung: b?.ampel_belegung ?? null,
    fehlendeStunden: text(b?.fehlende_stunden_woche),
    offeneStellen: text(b?.offene_stellen),
    freieU3: text(b?.freie_plaetze_u3),
    freieUe3: text(b?.freie_plaetze_ue3),
    leitungPerformance: text(b?.leitung_performance),
    kommentar: b?.kommentar ?? "",
  };
  const verlauf = (protokoll ?? [])
    .map((p) => ({
      id: p.id,
      wann: wann(p.geaendert_am),
      wer: p.geaendert_von ? (nutzerName.get(p.geaendert_von) ?? "Unbekannt") : "System",
      zeilen:
        p.tabelle === "marketing_bewertung"
          ? beschreibeBewertungsAenderung(p.aktion, p.alt as Record<string, unknown> | null, p.neu as Record<string, unknown> | null, (uid) => nutzerName.get(uid) ?? "Unbekannt")
          : [],
    }))
    .filter((p) => p.zeilen.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Button variant="ghost" size="xs" nativeButton={false} render={<Link href="/marketing" />} className="w-fit gap-1 text-muted-foreground">
          <ArrowLeft className="size-3.5" />
          Alle Einrichtungen
        </Button>
        <h1 className="font-heading text-3xl tracking-tight text-primary">{einrichtung.name}</h1>
        <p className="text-sm text-muted-foreground">
          {[
            einrichtung.kostenstelle ? `Kostenstelle ${einrichtung.kostenstelle}` : null,
            BUNDESLAENDER.find((x) => x.code === einrichtung.bundesland_code)?.label ?? einrichtung.bundesland_code,
            einrichtung.cluster ? `Cluster ${einrichtung.cluster}` : null,
            einrichtung.ort,
          ]
            .filter(Boolean)
            .join(" · ")}
          {b?.bewertet_am ? ` · zuletzt bewertet ${wann(b.bewertet_am)}${b.bewertet_von ? ` von ${nutzerName.get(b.bewertet_von) ?? "Unbekannt"}` : ""}` : " · noch nicht bewertet"}
        </p>
      </div>

      <BewertungForm einrichtungId={id} start={start} nutzer={nutzer ?? []} vorschlag={vorschlag} darfBearbeiten={zugriff === "bearbeiten"} />

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Verlauf</h2>
        {verlauf.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Änderungen.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {verlauf.map((v) => (
              <li key={v.id} className="rounded-xl border bg-card px-4 py-3 text-sm">
                <p className="text-xs text-muted-foreground">
                  {v.wer} · {v.wann}
                </p>
                <ul className="mt-1 list-disc pl-5">
                  {v.zeilen.map((z) => (
                    <li key={z}>{z}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
