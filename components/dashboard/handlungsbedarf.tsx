import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toIsoDateString, formatDate, parseIsoDate } from "@/lib/kita-datum";
import { berechneBelegungsVorschau } from "@/lib/belegung/vorschau";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { PassungsEinschaetzung } from "@/lib/kinder/gruppen-passung";
import type { Ampel } from "@/lib/team/anstellungsschluessel";

// Etwas weiter als die per-Gruppe-Ansicht, damit auch auf dem Dashboard nichts fehlt, das
// dort schon als "bald handeln" sichtbar wäre — aber verdichtet auf wenige Einträge gesamt.
const HANDLUNGSBEDARF_MONATE = 15;
const HANDLUNGSBEDARF_MAX_EINTRAEGE = 3;

const PASSUNG_AMPEL: Record<PassungsEinschaetzung, Ampel> = { gut: "gruen", bedingt: "gelb", schlecht: "rot" };
const PASSUNG_LABEL: Record<PassungsEinschaetzung, string> = {
  gut: "Gut passend",
  bedingt: "Bedingt passend",
  schlecht: "Schlecht passend",
};

function monatLang(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Einrichtungsweite Zusammenfassung des Handlungsbedarfs: die nächsten frei werdenden Plätze
 * über alle Gruppen hinweg samt Nachrücker-Vorschlägen — dieselbe Berechnung, die auch auf der
 * einzelnen Gruppenseite und unter /gruppen/vorschau läuft, hier nur einrichtungsweit verdichtet
 * statt je Gruppe. Rein informativ, erscheint nur, wenn in den nächsten Monaten etwas ansteht. */
export async function Handlungsbedarf({ einrichtungId }: { einrichtungId: string }) {
  const supabase = await createClient();

  const [{ data: gruppen }, { data: kinder }, { data: einrichtung }] = await Promise.all([
    supabase
      .from("gruppen")
      .select("id, name, gruppenart, sollplatze")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .order("sort_order"),
    supabase
      .from("kinder")
      .select("id, vorname, nachname, geburtsdatum, geschlecht, status, gruppe_id, eintritt, austritt, wohnort")
      .eq("einrichtung_id", einrichtungId)
      .is("archived_at", null)
      .limit(3000),
    supabase
      .from("einrichtungen")
      .select("bundesland_code, standort_gemeinde, auswaertigen_quote_prozent")
      .eq("id", einrichtungId)
      .single(),
  ]);

  if (!gruppen || gruppen.length === 0) return null;

  const auswaertigen =
    einrichtung?.bundesland_code === "bw" && einrichtung.standort_gemeinde && einrichtung.auswaertigen_quote_prozent !== null
      ? { standortGemeinde: einrichtung.standort_gemeinde, quoteProzent: Number(einrichtung.auswaertigen_quote_prozent) }
      : undefined;

  const heute = new Date();
  const start = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));

  const { freiwerdende } = berechneBelegungsVorschau(
    gruppen.map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) })),
    (kinder ?? []).map((k) => ({
      id: k.id,
      vorname: k.vorname,
      nachname: k.nachname,
      geburtsdatum: k.geburtsdatum,
      geschlecht: k.geschlecht,
      status: k.status,
      gruppeId: k.gruppe_id,
      eintritt: k.eintritt,
      austritt: k.austritt,
      wohnort: k.wohnort,
    })),
    start,
    HANDLUNGSBEDARF_MONATE,
    auswaertigen
  );

  const eintraege = freiwerdende.slice(0, HANDLUNGSBEDARF_MAX_EINTRAEGE);
  if (eintraege.length === 0) return null;

  return (
    <section className="flex flex-col gap-3 rounded-2xl border bg-secondary/30 p-5">
      <div className="flex items-center gap-2">
        <ClipboardList className="size-4 text-primary" aria-hidden />
        <h2 className="font-heading text-base text-primary">
          {freiwerdende.length === 1 ? "Ein Platz wird bald frei" : "Handlungsbedarf: Plätze werden bald frei"}
        </h2>
      </div>
      <ul className="flex flex-col gap-3 text-sm">
        {eintraege.map((f) => (
          <li key={`${f.monat}-${f.gruppeId}`} className="flex flex-col gap-1.5 rounded-xl border bg-card p-4">
            <p className="font-medium">
              {monatLang(f.monat)} — {f.gruppeName}: {f.anzahl === 1 ? "1 Platz wird frei" : `${f.anzahl} Plätze werden frei`}
            </p>
            {f.abgaenge.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                Austritt: {f.abgaenge.map((a) => `${a.name} (${formatDate(a.austritt)})`).join(", ")}
              </p>
            ) : null}
            {f.bereitsEingeplant.length > 0 ? (
              <p className="text-emerald-700 dark:text-emerald-400">
                Bereits vergeben an:{" "}
                {f.bereitsEingeplant.map((e, i) => (
                  <span key={e.kindId}>
                    {i > 0 ? ", " : ""}
                    <Link href={`/kinder/${e.kindId}`} className="font-medium underline-offset-2 hover:underline">
                      {e.name}
                    </Link>
                  </span>
                ))}
              </p>
            ) : null}
            {f.vorschlaege.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {f.vorschlaege.map((v) => (
                  <li key={v.kindId} className="flex flex-wrap items-center gap-2">
                    <Link href={`/kinder/${v.kindId}`} className="font-medium underline-offset-2 hover:underline">
                      {v.name}
                    </Link>
                    <AmpelBadge
                      ampel={PASSUNG_AMPEL[v.einschaetzung]}
                      labels={{ [PASSUNG_AMPEL[v.einschaetzung]]: PASSUNG_LABEL[v.einschaetzung] }}
                    />
                  </li>
                ))}
              </ul>
            ) : f.bereitsEingeplant.length < f.anzahl ? (
              <p className="text-xs text-muted-foreground">Kein passender Nachrücker vorgemerkt — prüfe die Warteliste.</p>
            ) : null}
          </li>
        ))}
      </ul>
      <Link href="/gruppen/vorschau" className="self-start text-xs text-primary underline-offset-2 hover:underline">
        Alle Gruppen &amp; mehr Monate ansehen →
      </Link>
    </section>
  );
}
