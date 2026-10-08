import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { canViewFinanzen, canWriteFinanzen } from "@/lib/server/current-user-role";
import { BeitraegeEditor } from "@/components/einrichtung/beitraege-editor";
import { ladeBeitragszeilen, preiseAmStichtag } from "@/lib/finanzen/elternbeitraege";
import { toIsoDateString } from "@/lib/kita-datum";
import {
  FoerderungManuellEditor,
  LohnnebenkostenEditor,
  JahressonderzahlungEditor,
} from "@/components/einrichtung/finanzen-editoren";

/** Reiter „Finanzen“: Förderbetrag, Lohnnebenkosten, Jahressonderzahlung und die Preisliste für Elternbeiträge — nur mit dem Recht „Finanzübersicht“. */
export default async function FinanzenEinstellungenPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();
  if (!einrichtungId || !(await canViewFinanzen(supabase, einrichtungId))) redirect("/einstellungen");
  const bearbeiteFinanzen = await canWriteFinanzen(supabase, einrichtungId);
  const zeigeFinanzen = true;

  const { data: einrichtung } = await supabase
    .from("einrichtungen")
    .select("bundesland_code, foerderung_monatlich_manuell, lohnnebenkosten_prozent, jahressonderzahlung_prozent, standort_gemeinde")
    .eq("id", einrichtungId)
    .single();

  // Preisliste (Elternbeiträge): Bänder des Bundeslands + die aktuell gültige Fassung (sonst die jüngste vorhandene)
  const beitragsDaten =
    zeigeFinanzen && einrichtungId && einrichtung
      ? await (async () => {
          const [{ data: baender }, zeilen] = await Promise.all([
            supabase.from("booking_time_bands").select("id, label, sort_order").eq("bundesland_code", einrichtung.bundesland_code).order("sort_order"),
            ladeBeitragszeilen(supabase, einrichtungId),
          ]);
          const versionen = [...new Set(zeilen.map((z) => z.gueltigAb))].sort().reverse();
          const heute = toIsoDateString(new Date());
          const angezeigt = versionen.find((v) => v <= heute) ?? versionen[0] ?? heute;
          const angezeigteZeilen = zeilen.filter((z) => z.gueltigAb === angezeigt);
          const preise = Object.fromEntries(preiseAmStichtag(angezeigteZeilen, angezeigt));
          return {
            baender: (baender ?? []).map((b) => ({ id: b.id, label: b.label })),
            preise,
            angezeigt,
            versionen,
            nachArt: angezeigteZeilen.some((z) => z.gruppenart),
            nachWohnsitz: angezeigteZeilen.some((z) => z.auswaertig),
          };
        })()
      : null;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-3xl tracking-tight text-primary">Finanzen</h1>
      {zeigeFinanzen && einrichtungId && einrichtung ? (
        <section className="flex flex-col gap-4 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Förderung, Kosten und Elternbeiträge</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Fördererlöse, Lohnnebenkosten und Jahressonderzahlung fließen ins Ergebnis in Controlling
            ein. Lohnnebenkosten und Jahressonderzahlung sind Schätzwerte mit uneinheitlichen Quellen —
            bei Bedarf an die eigene Situation anpassen.
          </p>
          <div className="flex flex-col gap-3">
            <FoerderungManuellEditor
              einrichtungId={einrichtungId}
              bundeslandCode={einrichtung.bundesland_code}
              wert={einrichtung.foerderung_monatlich_manuell}
              canEdit={bearbeiteFinanzen}
            />
            <LohnnebenkostenEditor
              einrichtungId={einrichtungId}
              prozent={Number(einrichtung.lohnnebenkosten_prozent)}
              canEdit={bearbeiteFinanzen}
            />
            <JahressonderzahlungEditor
              einrichtungId={einrichtungId}
              prozent={Number(einrichtung.jahressonderzahlung_prozent)}
              canEdit={bearbeiteFinanzen}
            />
          </div>
          {beitragsDaten && beitragsDaten.baender.length > 0 ? (
            <BeitraegeEditor
              key={beitragsDaten.angezeigt}
              einrichtungId={einrichtungId}
              baender={beitragsDaten.baender}
              preise={beitragsDaten.preise}
              gueltigAb={beitragsDaten.angezeigt}
              versionen={beitragsDaten.versionen}
              standortGemeinde={einrichtung.standort_gemeinde}
              nachArtVorbelegt={beitragsDaten.nachArt}
              nachWohnsitzVorbelegt={beitragsDaten.nachWohnsitz}
              canEdit={bearbeiteFinanzen}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
