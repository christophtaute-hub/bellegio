/**
 * Milestone 18: Testdaten für die Betreiber-Zentrale.
 *
 * - Test-Betreiber betreiber@bellegio.test (Passwort test1234) — Christoph ist
 *   bereits per SQL als Betreiber eingetragen.
 * - Platzhalter-Betreiberdaten ("Testdaten"), falls noch nichts hinterlegt ist
 *   — bitte in /admin/einstellungen durch die echten Angaben ersetzen.
 * - Testpreise für den Testkunden "Villa Kunterbunt" (49,00 € je Einrichtung,
 *   1,50 € je Kind) — KEINE echten Preise, nur damit der Rechnungsvorschlag
 *   sichtbar funktioniert.
 * - Demo-Rechnungen Jan–Sep 2026 mit Nummern "DEMO-2026-NN" (Jan–Jun bezahlt,
 *   Jul/Aug versendet, Sep als Entwurf) für die Einnahmen-Ansichten. Sie
 *   verbrauchen NICHT den echten Nummernkreis.
 *
 * Aufräumen der Demo-Rechnungen (freigegebene Rechnungen sind per Trigger
 * gegen Löschen geschützt, daher den Schutz-Trigger kurz abschalten):
 *   alter table public.rechnungen disable trigger rechnungen_schutz_trigger;
 *   delete from public.rechnungen where nummer like 'DEMO-%' or notiz like 'Demo-Rechnung%';
 *   alter table public.rechnungen enable trigger rechnungen_schutz_trigger;
 *
 * Nutzung: npx tsx --env-file=.env.local scripts/seed-milestone18-betreiber.ts
 * Idempotent.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const TEST_PASSWORD = "test1234";
const GRUNDGEBUEHR = 49;
const PREIS_PRO_KIND = 1.5;
const UST_SATZ = 19;

function monatsErster(jahr: number, monat: number): string {
  return `${jahr}-${String(monat).padStart(2, "0")}-01`;
}
function monatsLetzter(jahr: number, monat: number): string {
  return `${jahr}-${String(monat).padStart(2, "0")}-${String(new Date(Date.UTC(jahr, monat, 0)).getUTCDate()).padStart(2, "0")}`;
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local).");
    process.exit(1);
  }
  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  // 1. Test-Betreiber
  const { data: testTrager, error: testTragerError } = await supabase
    .from("trager")
    .select("id")
    .eq("name", "Bellegio Test")
    .single();
  if (testTragerError || !testTrager) throw new Error("Träger 'Bellegio Test' nicht gefunden.");

  let betreiberId: string;
  const { data: vorhandenesProfil } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("email", "betreiber@bellegio.test")
    .maybeSingle();
  if (vorhandenesProfil) {
    betreiberId = vorhandenesProfil.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email: "betreiber@bellegio.test",
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(error?.message ?? "createUser fehlgeschlagen");
    betreiberId = data.user.id;
    const { error: profilError } = await supabase.from("user_profiles").insert({
      id: betreiberId,
      email: "betreiber@bellegio.test",
      full_name: "Test-Betreiber",
      role: "mitarbeiter",
      trager_id: testTrager.id,
      kann_rechte_verwalten: false,
    });
    if (profilError) throw new Error(profilError.message);
    console.log("Test-Betreiber betreiber@bellegio.test angelegt.");
  }
  const { error: operatorError } = await supabase
    .from("platform_operators")
    .upsert({ user_id: betreiberId }, { onConflict: "user_id" });
  if (operatorError) throw new Error(operatorError.message);

  // 2. Platzhalter-Betreiberdaten
  const { data: einstellungen } = await supabase.from("betreiber_einstellungen").select("*").eq("id", true).single();
  if (einstellungen && !einstellungen.firmenname) {
    const { error } = await supabase
      .from("betreiber_einstellungen")
      .update({
        firmenname: "Bellegio (Testdaten)",
        anschrift: "Musterstraße 1\n12345 Musterstadt",
        ust_id: "DE000000000",
        iban: "DE00 0000 0000 0000 0000 00",
        bic: "TESTDE00XXX",
        bankname: "Testbank",
        zahlungsziel_tage: 14,
        ust_satz: UST_SATZ,
        fusszeile: "Testdaten — bitte unter Betreiber-Zentrale > Betreiberdaten ersetzen.",
      })
      .eq("id", true);
    if (error) throw new Error(error.message);
    console.log("Platzhalter-Betreiberdaten gesetzt.");
  }

  // 3. Testkunde Villa Kunterbunt
  const { data: kunde, error: kundeError } = await supabase
    .from("trager")
    .select("id, name")
    .eq("name", "Villa Kunterbunt")
    .single();
  if (kundeError || !kunde) throw new Error("Träger 'Villa Kunterbunt' nicht gefunden.");
  const { error: abrechnungError } = await supabase.from("trager_abrechnung").upsert({
    trager_id: kunde.id,
    rechnungsname: "Villa Kunterbunt (Testkunde)",
    rechnungsanschrift: "Kinderweg 7\n80331 München",
    rechnungs_email: "rechnung@villa-kunterbunt.test",
    preis_grundgebuehr_pro_einrichtung: GRUNDGEBUEHR,
    preis_pro_kind: PREIS_PRO_KIND,
  });
  if (abrechnungError) throw new Error(abrechnungError.message);

  const { data: einrichtungen, error: einrichtungenError } = await supabase
    .from("einrichtungen")
    .select("id, name")
    .eq("trager_id", kunde.id)
    .is("archived_at", null)
    .order("name");
  if (einrichtungenError) throw new Error(einrichtungenError.message);

  // 4. Demo-Rechnungen
  const { data: betreiber } = await supabase.from("betreiber_einstellungen").select("*").eq("id", true).single();
  const absender = {
    firmenname: betreiber?.firmenname,
    anschrift: betreiber?.anschrift,
    ust_id: betreiber?.ust_id,
    steuernummer: betreiber?.steuernummer,
    iban: betreiber?.iban,
    bic: betreiber?.bic,
    bankname: betreiber?.bankname,
    ust_hinweis: betreiber?.ust_hinweis,
    fusszeile: betreiber?.fusszeile,
    zahlungsziel_tage: betreiber?.zahlungsziel_tage,
  };
  const empfaenger = {
    name: "Villa Kunterbunt (Testkunde)",
    anschrift: "Kinderweg 7\n80331 München",
    ust_id: null,
    email: "rechnung@villa-kunterbunt.test",
  };

  const jahr = 2026;
  for (let monat = 1; monat <= 9; monat++) {
    const nummer = `DEMO-${jahr}-${String(monat).padStart(2, "0")}`;
    const status = monat <= 6 ? "bezahlt" : monat <= 8 ? "versendet" : "entwurf";
    const von = monatsErster(jahr, monat);

    const { data: vorhanden } = await supabase
      .from("rechnungen")
      .select("id")
      .or(`nummer.eq.${nummer},and(notiz.like.Demo-Rechnung%,leistungszeitraum_von.eq.${von})`)
      .maybeSingle();
    if (vorhanden) continue;

    const { data: rechnung, error } = await supabase
      .from("rechnungen")
      .insert({
        trager_id: kunde.id,
        leistungszeitraum_von: von,
        leistungszeitraum_bis: monatsLetzter(jahr, monat),
        ust_satz: UST_SATZ,
        notiz: "Demo-Rechnung (Testdaten)",
      })
      .select("id")
      .single();
    if (error || !rechnung) throw new Error(error?.message ?? "Rechnung konnte nicht angelegt werden.");

    let pos = 0;
    const positionen: Database["public"]["Tables"]["rechnungspositionen"]["Insert"][] = [];
    for (const einrichtung of einrichtungen ?? []) {
      const { count } = await supabase
        .from("kinder")
        .select("id", { count: "exact", head: true })
        .eq("einrichtung_id", einrichtung.id)
        .is("archived_at", null)
        .neq("status", "nachruecker")
        .not("eintritt", "is", null)
        .lte("eintritt", von)
        .or(`austritt.is.null,austritt.gt.${von}`);
      const kinder = count ?? 0;
      positionen.push({
        rechnung_id: rechnung.id,
        pos: ++pos,
        beschreibung: `Bellegio Grundgebühr — ${einrichtung.name}`,
        einrichtung_id: einrichtung.id,
        einrichtung_name: einrichtung.name,
        menge: 1,
        einheit: "Monat",
        einzelpreis_netto: GRUNDGEBUEHR,
      });
      positionen.push({
        rechnung_id: rechnung.id,
        pos: ++pos,
        beschreibung: `Bellegio Nutzung je Kind — ${einrichtung.name} (${kinder} Kinder am ${von.split("-").reverse().join(".")})`,
        einrichtung_id: einrichtung.id,
        einrichtung_name: einrichtung.name,
        menge: kinder,
        einheit: "Kind",
        einzelpreis_netto: PREIS_PRO_KIND,
        kinderzahl_snapshot: kinder,
      });
    }
    const { error: positionenError } = await supabase.from("rechnungspositionen").insert(positionen);
    if (positionenError) throw new Error(positionenError.message);

    if (status !== "entwurf") {
      const rechnungsdatum = monatsLetzter(jahr, monat);
      const faellig = new Date(Date.UTC(jahr, monat - 1, Number(rechnungsdatum.slice(8)) + 14)).toISOString().slice(0, 10);
      const { error: freigabeError } = await supabase
        .from("rechnungen")
        .update({
          nummer,
          status: "versendet",
          rechnungsdatum,
          faellig_am: faellig,
          versendet_am: new Date(`${rechnungsdatum}T09:00:00Z`).toISOString(),
          absender,
          empfaenger,
        })
        .eq("id", rechnung.id);
      if (freigabeError) throw new Error(freigabeError.message);
      if (status === "bezahlt") {
        const { error: bezahltError } = await supabase
          .from("rechnungen")
          .update({ status: "bezahlt", bezahlt_am: faellig })
          .eq("id", rechnung.id);
        if (bezahltError) throw new Error(bezahltError.message);
      }
    }
    console.log(`  ${status === "entwurf" ? "Entwurf" : nummer} (${status}) angelegt.`);
  }

  console.log("\nFertig. Login Test-Betreiber: betreiber@bellegio.test / test1234");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
