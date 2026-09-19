import { createClient } from "@/lib/supabase/server";
import { BetreiberEinstellungenForm } from "@/components/admin/betreiber-einstellungen-form";

export default async function BetreiberEinstellungenPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("betreiber_einstellungen").select("*").eq("id", true).single();

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
    </div>
  );
}
