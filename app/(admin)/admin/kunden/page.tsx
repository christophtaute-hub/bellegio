import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import type { OperatorKennzahl } from "@/lib/admin/abrechnung";
import { TragerAbrechnungForm } from "@/components/admin/trager-abrechnung-form";
import { Badge } from "@/components/ui/badge";

export default async function KundenPage() {
  const supabase = await createClient();
  const heute = toIsoDateString(new Date());
  const [{ data: kennzahlen }, { data: abrechnungen }] = await Promise.all([
    supabase.rpc("operator_kennzahlen", { p_stichtag: heute }),
    supabase.from("trager_abrechnung").select("*"),
  ]);

  const traeger = new Map<string, { name: string; einrichtungen: OperatorKennzahl[] }>();
  for (const k of (kennzahlen ?? []) as OperatorKennzahl[]) {
    const eintrag = traeger.get(k.trager_id) ?? { name: k.trager_name, einrichtungen: [] };
    if (k.einrichtung_id) eintrag.einrichtungen.push(k);
    traeger.set(k.trager_id, eintrag);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kunden &amp; Preise</h1>
        <p className="text-sm text-muted-foreground">
          Rechnungsdaten und optionale Preise je Träger. Ohne Preise entstehen Rechnungen aus freien Positionen.
        </p>
      </div>

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
