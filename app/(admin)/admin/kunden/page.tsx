import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import type { OperatorKennzahl } from "@/lib/admin/abrechnung";
import { TragerAbrechnungForm } from "@/components/admin/trager-abrechnung-form";
import { Badge } from "@/components/ui/badge";
import { ListenpreiseForm } from "@/components/admin/listenpreise-form";
import { ladeListenpreise } from "@/lib/preise";
import { DOKUMENTE } from "@/lib/rechtstexte/version";
import { buttonVariants } from "@/components/ui/button";

export default async function KundenPage() {
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());
  const [{ data: kennzahlen }, { data: abrechnungen }, listenpreise, { data: zustimmungen }] = await Promise.all([
    supabase.rpc("operator_kennzahlen", { p_stichtag: heute }),
    supabase.from("trager_abrechnung").select("*"),
    ladeListenpreise(supabase),
    supabase.from("vertragszustimmungen").select("trager_id, dokument, version, zugestimmt_am"),
  ]);

  const traeger = new Map<string, { name: string; einrichtungen: OperatorKennzahl[] }>();
  for (const k of (kennzahlen ?? []) as OperatorKennzahl[]) {
    const eintrag = traeger.get(k.trager_id) ?? { name: k.trager_name, einrichtungen: [] };
    if (k.einrichtung_id) eintrag.einrichtungen.push(k);
    traeger.set(k.trager_id, eintrag);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-3xl tracking-tight text-primary">Kunden &amp; Preise</h1>
          <p className="text-sm text-muted-foreground">
            Rechnungsdaten und optionale Preise je Träger. Ohne Preise entstehen Rechnungen aus freien Positionen.
          </p>
        </div>
        <Link href="/admin/kunden/neu" className={buttonVariants({ size: "sm" })}>
          <Plus className="size-3.5" />
          Neuen Kunden anlegen
        </Link>
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg text-primary">Listenpreise (Landingpage)</h2>
          <p className="text-sm text-muted-foreground">
            Diese Preise stehen öffentlich auf der Landingpage und dienen neuen Kunden als Vorbelegung. Individuelle
            Preise trägst du je Kunde weiter unten ein. Solange nichts eingetragen ist, zeigt die Landingpage „Preise
            folgen“.
          </p>
        </div>
        <ListenpreiseForm initial={listenpreise} />
      </section>

      {Array.from(traeger.entries()).map(([id, t]) => {
        const abrechnung = (abrechnungen ?? []).find((a) => a.trager_id === id);
        const kinder = t.einrichtungen.reduce((s, e) => s + (e.aktive_kinder ?? 0), 0);
        return (
          <section key={id} className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-heading text-lg text-primary">{t.name}</h2>
              <Badge variant="secondary">
                {t.einrichtungen.length} Einrichtungen · {kinder} aktive Kinder
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {DOKUMENTE.map((d) => {
                const z = (zustimmungen ?? [])
                  .filter((x) => x.trager_id === id && x.dokument === d.key && x.version === d.version)
                  .sort((a, b) => a.zugestimmt_am.localeCompare(b.zugestimmt_am))[0];
                return `${d.key.toUpperCase()}: ${z ? `zugestimmt am ${new Date(z.zugestimmt_am).toLocaleDateString("de-DE")} (Version ${d.version})` : "noch nicht zugestimmt"}`;
              }).join(" · ")}
            </p>
            {t.einrichtungen.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.einrichtungen.map((e) => `${e.einrichtung_name} (${e.aktive_kinder ?? 0})`).join(" · ")}
              </p>
            ) : null}
            <TragerAbrechnungForm
              tragerId={id}
              initial={{
                rechnungsname: abrechnung?.rechnungsname ?? null,
                rechnungsanschrift: abrechnung?.rechnungsanschrift ?? null,
                rechnungs_email: abrechnung?.rechnungs_email ?? null,
                ust_id: abrechnung?.ust_id ?? null,
                preis_grundgebuehr_pro_einrichtung: abrechnung?.preis_grundgebuehr_pro_einrichtung ?? null,
                preis_pro_kind: abrechnung?.preis_pro_kind ?? null,
              }}
            />
          </section>
        );
      })}
    </div>
  );
}
