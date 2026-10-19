import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMarketingZugriff } from "@/lib/server/marketing";
import { ladeMarketingEinstellungen } from "@/lib/marketing/einstellungen";
import { EinstellungenForm } from "@/components/marketing/einstellungen-form";

/** Kriterien, Grenzwerte und Fristen — nur mit Marketing-Recht „bearbeiten“. */
export default async function MarketingEinstellungenPage() {
  if ((await getMarketingZugriff()) !== "bearbeiten") notFound();
  const supabase = await createClient();
  const einstellungen = await ladeMarketingEinstellungen(supabase);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Kriterien &amp; Fristen</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">Gilt für alle Einrichtungen deines Trägers.</p>
      </div>
      <EinstellungenForm start={einstellungen} />
    </div>
  );
}
