import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString } from "@/lib/kita-datum";
import type { PositionInput } from "@/lib/admin/abrechnung";
import { RechnungStatusBadge } from "@/components/admin/status-badge";
import { RechnungEditor } from "@/components/admin/rechnung-editor";
import { RechnungAktionen } from "@/components/admin/rechnung-aktionen";
import {
  RechnungDokument,
  type RechnungAbsender,
  type RechnungEmpfaenger,
} from "@/components/admin/rechnung-dokument";

export default async function RechnungDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rechnung } = await supabase
    .from("rechnungen")
    .select("*, trager(name)")
    .eq("id", id)
    .single();
  if (!rechnung) notFound();

  const istEntwurf = rechnung.status === "entwurf";
  const [{ data: positionen }, { data: stornoOriginal }, { data: einstellungen }, { data: abrechnung }, { data: einrichtungen }] =
    await Promise.all([
      supabase.from("rechnungspositionen").select("*").eq("rechnung_id", id).order("pos"),
      rechnung.storno_von
        ? supabase.from("rechnungen").select("nummer").eq("id", rechnung.storno_von).single()
        : Promise.resolve({ data: null }),
      istEntwurf
        ? supabase.from("betreiber_einstellungen").select("*").eq("id", true).single()
        : Promise.resolve({ data: null }),
      istEntwurf
        ? supabase.from("trager_abrechnung").select("*").eq("trager_id", rechnung.trager_id).maybeSingle()
        : Promise.resolve({ data: null }),
      istEntwurf
        ? supabase.from("einrichtungen").select("id, name").eq("trager_id", rechnung.trager_id).is("archived_at", null).order("name")
        : Promise.resolve({ data: null }),
    ]);

  const tragerName = (rechnung.trager as unknown as { name: string } | null)?.name ?? "";
  const absender: RechnungAbsender = istEntwurf
    ? (einstellungen ?? {})
    : ((rechnung.absender ?? {}) as RechnungAbsender);
  const empfaenger: RechnungEmpfaenger = istEntwurf
    ? {
        name: abrechnung?.rechnungsname || tragerName,
        anschrift: abrechnung?.rechnungsanschrift,
        ust_id: abrechnung?.ust_id,
        email: abrechnung?.rechnungs_email,
      }
    : ((rechnung.empfaenger ?? {}) as RechnungEmpfaenger);

  const anzeigePositionen = (positionen ?? []).map((p) => ({
    beschreibung: p.beschreibung,
    menge: Number(p.menge),
    einheit: p.einheit,
    einzelpreis_netto: Number(p.einzelpreis_netto),
    summe_netto: p.summe_netto === null ? null : Number(p.summe_netto),
  }));
  const editorPositionen: PositionInput[] = (positionen ?? []).map((p) => ({
    beschreibung: p.beschreibung,
    einrichtung_id: p.einrichtung_id,
    einrichtung_name: p.einrichtung_name,
    menge: Number(p.menge),
    einheit: p.einheit,
    einzelpreis_netto: Number(p.einzelpreis_netto),
    kinderzahl_snapshot: p.kinderzahl_snapshot,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 print:hidden">
        <Link href="/admin/rechnungen" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Alle Rechnungen
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-3xl tracking-tight text-primary">
            {rechnung.storno_von ? "Gutschrift" : "Rechnung"} {rechnung.nummer ?? ""}
          </h1>
          <RechnungStatusBadge status={rechnung.status} />
          <span className="text-sm text-muted-foreground">{tragerName}</span>
        </div>
      </div>

      {istEntwurf ? (
        <RechnungEditor
          rechnungId={rechnung.id}
          initial={{
            leistungszeitraum_von: rechnung.leistungszeitraum_von,
            leistungszeitraum_bis: rechnung.leistungszeitraum_bis,
            ust_satz: Number(rechnung.ust_satz),
            notiz: rechnung.notiz,
          }}
          positionen={editorPositionen}
          einrichtungen={einrichtungen ?? []}
        />
      ) : (
        <RechnungAktionen
          rechnungId={rechnung.id}
          status={rechnung.status}
          darfStornieren={rechnung.storno_von === null}
          heute={toIsoDateString(new Date())}
        />
      )}

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
          storno_von_nummer: stornoOriginal?.nummer ?? null,
        }}
        positionen={anzeigePositionen}
        absender={absender}
        empfaenger={empfaenger}
      />
    </div>
  );
}
