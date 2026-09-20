import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserRole } from "@/lib/server/current-user-role";
import { toIsoDateString } from "@/lib/kita-datum";
import { RechnungAktionen } from "@/components/admin/rechnung-aktionen";
import {
  RechnungDokument,
  type RechnungAbsender,
  type RechnungEmpfaenger,
} from "@/components/admin/rechnung-dokument";

export default async function AbrechnungRechnungPage({ params }: { params: Promise<{ id: string }> }) {
  if ((await getCurrentUserRole()) !== "traeger_admin") notFound();
  const { id } = await params;
  const supabase = await createClient();

  // RLS liefert nur freigegebene Rechnungen des eigenen Trägers.
  const { data: rechnung } = await supabase.from("rechnungen").select("*").eq("id", id).single();
  if (!rechnung) notFound();

  const [{ data: positionen }, { data: original }] = await Promise.all([
    supabase.from("rechnungspositionen").select("*").eq("rechnung_id", id).order("pos"),
    rechnung.storno_von
      ? supabase.from("rechnungen").select("nummer").eq("id", rechnung.storno_von).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link href="/abrechnung" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden">
        <ArrowLeft className="size-3.5" />
        Alle Rechnungen
      </Link>
      <RechnungAktionen
        rechnungId={rechnung.id}
        status={rechnung.status}
        darfStornieren={false}
        heute={toIsoDateString(new Date())}
        nurDrucken
      />
      <RechnungDokument
        rechnung={{
          nummer: rechnung.nummer,
          status: rechnung.status,
          rechnungsdatum: rechnung.rechnungsdatum,
          faellig_am: rechnung.faellig_am,
          leistungszeitraum_von: rechnung.leistungszeitraum_von,
          leistungszeitraum_bis: rechnung.leistungszeitraum_bis,
          summe_netto: Number(rechnung.summe_netto),
          ust_satz: Number(rechnung.ust_satz),
          summe_ust: Number(rechnung.summe_ust),
          summe_brutto: Number(rechnung.summe_brutto),
          notiz: rechnung.notiz,
          storno_von_nummer: original?.nummer ?? null,
        }}
        positionen={(positionen ?? []).map((p) => ({
          beschreibung: p.beschreibung,
          menge: Number(p.menge),
          einheit: p.einheit,
          einzelpreis_netto: Number(p.einzelpreis_netto),
          summe_netto: p.summe_netto === null ? null : Number(p.summe_netto),
        }))}
        absender={(rechnung.absender ?? {}) as RechnungAbsender}
        empfaenger={(rechnung.empfaenger ?? {}) as RechnungEmpfaenger}
      />
    </div>
  );
}
