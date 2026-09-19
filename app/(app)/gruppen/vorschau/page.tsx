import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";
import { getZugriff } from "@/lib/server/current-user-role";
import { formatDate, parseIsoDate, toIsoDateString } from "@/lib/kita-datum";
import { berechneBelegungsVorschau } from "@/lib/belegung/vorschau";
import { AmpelBadge } from "@/components/team/ampel-badge";
import type { PassungsEinschaetzung } from "@/lib/kinder/gruppen-passung";
import type { Ampel } from "@/lib/team/anstellungsschluessel";
import { cn } from "cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MONATE = 18;

const PASSUNG_AMPEL: Record<PassungsEinschaetzung, Ampel> = { gut: "gruen", bedingt: "gelb", schlecht: "rot" };
const PASSUNG_LABEL: Record<PassungsEinschaetzung, string> = {
  gut: "Gut passend",
  bedingt: "Bedingt passend",
  schlecht: "Schlecht passend",
};

function monatKurz(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "short", year: "2-digit", timeZone: "UTC" });
}
function monatLang(monat: string): string {
  return parseIsoDate(monat).toLocaleDateString("de-DE", { month: "long", year: "numeric", timeZone: "UTC" });
}

export default async function BelegungsVorschauPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const zugriff = einrichtungId ? await getZugriff(supabase, einrichtungId, "belegung") : "kein_zugriff";
  if (!einrichtungId || zugriff === "kein_zugriff") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">Belegungs-Vorschau</h1>
        <p className="text-sm text-muted-foreground">Für diesen Bereich hast du keinen Zugriff auf die aktuelle Einrichtung.</p>
      </div>
    );
  }

  const heute = new Date();
  const start = toIsoDateString(new Date(Date.UTC(heute.getUTCFullYear(), heute.getUTCMonth(), 1)));

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

  const auswaertigen =
    einrichtung?.bundesland_code === "bw" &&
    einrichtung.standort_gemeinde &&
    einrichtung.auswaertigen_quote_prozent !== null
      ? { standortGemeinde: einrichtung.standort_gemeinde, quoteProzent: Number(einrichtung.auswaertigen_quote_prozent) }
      : undefined;

  const { zeilen, freiwerdende } = berechneBelegungsVorschau(
    (gruppen ?? []).map((g) => ({ id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: Number(g.sollplatze) })),
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
    MONATE,
    auswaertigen
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Link href="/gruppen" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Gruppen
        </Link>
        <h1 className="font-heading text-3xl tracking-tight text-primary">Belegungs-Vorschau</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Freie Plätze je Gruppe für die nächsten {MONATE} Monate (Stichtag jeweils der Erste) — aus Eintritten und
          Austritten. In Klammern: bereits eingeplante Nachrücker.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="sticky left-0 z-10 bg-card">Gruppe (Soll)</TableHead>
              {zeilen[0]?.zellen.map((z) => (
                <TableHead key={z.monat} className="text-right whitespace-nowrap">
                  {monatKurz(z.monat)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {zeilen.map((zeile) => (
              <TableRow key={zeile.gruppe.id}>
                <TableCell className="sticky left-0 z-10 bg-card font-medium whitespace-nowrap">
                  {zeile.gruppe.name} <span className="text-muted-foreground">({zeile.gruppe.sollplatze})</span>
                </TableCell>
                {zeile.zellen.map((z) => (
                  <TableCell
                    key={z.monat}
                    className={cn(
                      "text-right tabular-nums",
                      z.frei < 0 ? "font-semibold text-destructive" : z.frei === 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                    )}
                    title={`${z.belegt} belegt${z.nachrueckerGeplant > 0 ? `, ${z.nachrueckerGeplant} Nachrücker eingeplant` : ""}`}
                  >
                    {z.frei}
                    {z.nachrueckerGeplant > 0 ? <span className="text-xs text-muted-foreground"> ({z.nachrueckerGeplant})</span> : null}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {zeilen.length === 0 ? (
              <TableRow>
                <TableCell colSpan={MONATE + 1} className="text-center text-muted-foreground">
                  Noch keine Gruppen angelegt.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Grün: freie Plätze · Gelb: Gruppe voll · Rot: überbelegt. Die Zahl zählt Kinder, keine Platzwerte (Krippenkinder
        belegen also nicht doppelt).
      </p>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg text-primary">Frei werdende Plätze &amp; Nachrücker-Vorschläge</h2>
        {freiwerdende.length === 0 ? (
          <p className="text-sm text-muted-foreground">In den nächsten {MONATE} Monaten werden keine Plätze frei.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {freiwerdende.map((f) => (
              <li key={`${f.monat}-${f.gruppeId}`} className="flex flex-col gap-2 rounded-xl border bg-secondary/30 p-4">
                <p className="text-sm font-medium">
                  {monatLang(f.monat)} — {f.gruppeName}:{" "}
                  {f.anzahl === 1 ? "1 Platz wird frei" : `${f.anzahl} Plätze werden frei`}
                </p>
                {f.abgaenge.length > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Austritt: {f.abgaenge.map((a) => `${a.name} (${formatDate(a.austritt)})`).join(", ")}
                  </p>
                ) : null}
                {f.bereitsEingeplant.length > 0 ? (
                  <p className="text-sm text-emerald-700 dark:text-emerald-400">
                    Bereits vergeben an:{" "}
                    {f.bereitsEingeplant.map((e, i) => (
                      <span key={e.kindId}>
                        {i > 0 ? ", " : ""}
                        <Link href={`/kinder/${e.kindId}`} className="font-medium underline-offset-2 hover:underline">
                          {e.name}
                        </Link>{" "}
                        (Eintritt {formatDate(e.eintritt)})
                      </span>
                    ))}
                  </p>
                ) : null}
                {f.vorschlaege.length > 0 ? (
                  <ul className="flex flex-col gap-1.5">
                    {f.vorschlaege.map((v) => (
                      <li key={v.kindId} className="flex flex-wrap items-center gap-2 text-sm">
                        <Link href={`/kinder/${v.kindId}`} className="font-medium underline-offset-2 hover:underline">
                          {v.name}
                        </Link>
                        <AmpelBadge ampel={PASSUNG_AMPEL[v.einschaetzung]} labels={{ [PASSUNG_AMPEL[v.einschaetzung]]: PASSUNG_LABEL[v.einschaetzung] }} />
                        {v.geplanteGruppeGleich ? <span className="text-xs text-muted-foreground">bereits für diese Gruppe vorgemerkt</span> : null}
                        {v.eintritt ? <span className="text-xs text-muted-foreground">Eintritt geplant {formatDate(v.eintritt)}</span> : null}
                        {v.ueberAuswaertigenQuote ? <span className="text-xs font-medium text-destructive">über der Auswärtigen-Quote</span> : null}
                      </li>
                    ))}
                  </ul>
                ) : f.bereitsEingeplant.length < f.anzahl ? (
                  <p className="text-xs text-muted-foreground">Kein passender Nachrücker vorgemerkt.</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Reine Empfehlung nach Alter und Geschlecht (ggf. Auswärtigen-Quote) — die Entscheidung bleibt bei dir.
        </p>
      </section>
    </div>
  );
}
