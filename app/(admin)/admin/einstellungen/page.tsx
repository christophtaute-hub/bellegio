import { createClient } from "@/lib/supabase/server";
import { BetreiberEinstellungenForm } from "@/components/admin/betreiber-einstellungen-form";
import { BetreiberOeffentlichForm } from "@/components/admin/betreiber-oeffentlich-form";
import { empfohleneAngaben, fehlendeAngaben, ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";

export default async function BetreiberEinstellungenPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("betreiber_einstellungen").select("*").eq("id", true).single();
  const oeffentlich = await ladeBetreiberOeffentlich(supabase);
  const fehlt = fehlendeAngaben(oeffentlich);
  const empfohlen = empfohleneAngaben(oeffentlich);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Betreiberdaten</h1>
        <p className="text-sm text-muted-foreground">
          Absender, Bankverbindung und Standardwerte für deine Rechnungen.
        </p>
      </div>
      {data ? (
        <BetreiberEinstellungenForm
          initial={{
            firmenname: data.firmenname,
            anschrift: data.anschrift,
            ust_id: data.ust_id,
            steuernummer: data.steuernummer,
            iban: data.iban,
            bic: data.bic,
            bankname: data.bankname,
            zahlungsziel_tage: data.zahlungsziel_tage,
            ust_satz: Number(data.ust_satz),
            ust_hinweis: data.ust_hinweis,
            rechnungsnummer_praefix: data.rechnungsnummer_praefix,
            fusszeile: data.fusszeile,
          }}
        />
      ) : (
        <p className="text-sm text-destructive">Betreiberdaten konnten nicht geladen werden.</p>
      )}

      <section className="flex flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg text-primary">Angaben für Impressum, Datenschutz und Verträge</h2>
          <p className="text-sm text-muted-foreground">
            Diese Angaben stehen öffentlich in Impressum, Datenschutzerklärung, AGB und Auftragsverarbeitungsvertrag. Fehlende Pflichtangaben erscheinen dort als
            sichtbare Lücke.
          </p>
          {fehlt.length > 0 ? (
            <p className="text-sm text-destructive">Pflichtangaben fehlen noch: {fehlt.join(", ")}.</p>
          ) : (
            <p className="text-sm text-primary">Alle Pflichtangaben sind ausgefüllt.</p>
          )}
          {empfohlen.length > 0 ? <p className="text-xs text-muted-foreground">Je nach Rechtsform zusätzlich empfohlen: {empfohlen.join(", ")}.</p> : null}
        </div>
        <BetreiberOeffentlichForm
          initial={oeffentlich}
          rechnungsdaten={{ firmenname: data?.firmenname ?? null, anschrift: data?.anschrift ?? null, ust_id: data?.ust_id ?? null }}
        />
      </section>
    </div>
  );
}
