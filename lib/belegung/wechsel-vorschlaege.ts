import { parseIsoDate, toIsoDateString, vorgeschlagenerAustritt } from "@/lib/kita-datum";
import { bewertePassung } from "@/lib/kinder/gruppen-passung";
import type { FreiwerdenderPlatz, VorschauGruppe, VorschauKind, VorschauZeile } from "@/lib/belegung/vorschau";

/** Ein Vorschlag für einen internen Wechsel, z. B. Krippe → Kindergarten: Kind X könnte ab Datum Y in Gruppe Z wechseln. */
export type WechselVorschlag = {
  kindId: string;
  name: string;
  vonGruppeId: string;
  vonGruppeName: string;
  nachGruppeId: string;
  nachGruppeName: string;
  /** Erster Tag des Monats, ab dem der Wechsel möglich ist (Platz frei, Alter erreicht). */
  abDatum: string;
  /** Austrittsdatum, das ein Kindergartenkind sinnvollerweise bekommt (Einschulung) — das bisherige Krippen-Austrittsdatum entfällt. */
  neuerAustritt: string;
  /** Kind im Kindergarten, dessen Platz frei wird und den der Wechsel übernimmt (falls einer in diesem Monat geht). */
  ersetztKind: { kindId: string; name: string; austritt: string } | null;
};

/** Ein Kind, das die Krippe verlassen muss, für das aber bis dahin kein Kindergartenplatz absehbar ist. */
export type WechselOhnePlatz = {
  kindId: string;
  name: string;
  vonGruppeName: string;
  fruehesterTermin: string;
  austritt: string;
};

const KINDERGARTEN_ARTEN = ["kindergarten", "altersgemischt"];

function monatsErster(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Frühester Monatserster, ab dem das Kind in den Kindergarten wechseln kann: der Tag des 3. Geburtstags, wenn er auf einen
 * Monatsersten fällt, sonst der Monatserste danach. */
export function fruehesterWechselTermin(geburtsdatum: string): string {
  const dritter = parseIsoDate(geburtsdatum);
  dritter.setUTCFullYear(dritter.getUTCFullYear() + 3);
  if (dritter.getUTCDate() === 1) return toIsoDateString(dritter);
  return toIsoDateString(new Date(Date.UTC(dritter.getUTCFullYear(), dritter.getUTCMonth() + 1, 1)));
}

/** Reine Funktion: schlägt für aktive Krippenkinder einen Wechsel in eine Kindergartengruppe vor — zum frühesten Termin ab dem
 * 3. Geburtstag, in dem dort ein Platz frei ist (Sollplätze − belegte Plätze − fest eingeplante Nachrücker − bereits vergebene
 * Wechsel). Die ältesten Kinder kommen zuerst an die Reihe. Kinder, deren Krippen-Austritt in den Vorschauzeitraum fällt und für
 * die kein Platz absehbar ist, stehen in `ohnePlatz`. Die Regeln sind Planungshilfen, keine gesetzliche Vorgabe: gesetzlich ist
 * nur geregelt, welche Faktoren und Schlüssel je Gruppenart gelten. */
export function berechneWechselVorschlaege(eingabe: {
  gruppen: VorschauGruppe[];
  kinder: VorschauKind[];
  zeilen: VorschauZeile[];
  freiwerdende: FreiwerdenderPlatz[];
  /** Kinder, für die bereits ein Wechsel geplant ist — sie bekommen keinen weiteren Vorschlag, belegen aber den Zielplatz. */
  geplanteWechsel: { kindId: string; nachGruppeId: string; abDatum: string }[];
}): { vorschlaege: WechselVorschlag[]; ohnePlatz: WechselOhnePlatz[] } {
  const { gruppen, kinder, zeilen, freiwerdende } = eingabe;
  const monate = zeilen[0]?.zellen.map((z) => z.monat) ?? [];
  if (monate.length === 0) return { vorschlaege: [], ohnePlatz: [] };
  const letzterMonat = monate[monate.length - 1];

  const krippenIds = new Set(gruppen.filter((g) => g.gruppenart === "krippe").map((g) => g.id));
  const zielGruppen = gruppen.filter((g) => KINDERGARTEN_ARTEN.includes(g.gruppenart));
  const gruppeName = new Map(gruppen.map((g) => [g.id, g.name]));
  const zeileDerGruppe = new Map(zeilen.map((z) => [z.gruppe.id, z]));

  // Reservierte Plätze je Zielgruppe und Monat (bereits geplante und im Lauf vergebene Wechsel)
  const reserviert = new Map<string, number>();
  const reserviere = (gruppeId: string, ab: string) => {
    for (const m of monate) if (m >= ab) reserviert.set(`${gruppeId}|${m}`, (reserviert.get(`${gruppeId}|${m}`) ?? 0) + 1);
  };
  for (const w of eingabe.geplanteWechsel) reserviere(w.nachGruppeId, monatsErster(w.abDatum));
  const geplantIds = new Set(eingabe.geplanteWechsel.map((w) => w.kindId));

  const kandidaten = kinder
    .filter((k) => k.status === "aktiv" && k.gruppeId && krippenIds.has(k.gruppeId) && !geplantIds.has(k.id))
    .sort((a, b) => a.geburtsdatum.localeCompare(b.geburtsdatum));

  const vergebeneAbgaenge = new Set<string>();
  const vorschlaege: WechselVorschlag[] = [];
  const ohnePlatz: WechselOhnePlatz[] = [];

  for (const kind of kandidaten) {
    const frueh = fruehesterWechselTermin(kind.geburtsdatum);
    const austrittMonat = kind.austritt ? monatsErster(kind.austritt) : null;
    const fenster = monate.filter((m) => m >= frueh && (austrittMonat === null || m <= austrittMonat));

    let gefunden: WechselVorschlag | null = null;
    for (const monat of fenster) {
      const kandidatenGruppen = zielGruppen
        .map((g) => {
          const zelle = zeileDerGruppe.get(g.id)?.zellen.find((z) => z.monat === monat);
          const frei = zelle ? zelle.frei - zelle.nachrueckerGeplant - (reserviert.get(`${g.id}|${monat}`) ?? 0) : 0;
          const passung = bewertePassung(
            { geburtsdatum: kind.geburtsdatum, geschlecht: "keine_angabe" },
            { id: g.id, name: g.name, gruppenart: g.gruppenart, sollplatze: g.sollplatze, aktiveKinder: [] },
            new Date(`${monat}T00:00:00Z`)
          );
          return { gruppe: g, frei, passung };
        })
        .filter((c) => c.frei > 0 && c.passung.einschaetzung !== "schlecht")
        .sort((a, b) => b.passung.score - a.passung.score || b.frei - a.frei);
      const beste = kandidatenGruppen[0];
      if (!beste) continue;

      const abgang = freiwerdende
        .find((f) => f.gruppeId === beste.gruppe.id && f.monat === monat)
        ?.abgaenge.find((a) => !a.nachfolger && !vergebeneAbgaenge.has(a.kindId));
      gefunden = {
        kindId: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        vonGruppeId: kind.gruppeId as string,
        vonGruppeName: gruppeName.get(kind.gruppeId as string) ?? "",
        nachGruppeId: beste.gruppe.id,
        nachGruppeName: beste.gruppe.name,
        abDatum: monat,
        neuerAustritt: vorgeschlagenerAustritt(kind.geburtsdatum, false, new Date(`${monat}T00:00:00Z`)),
        ersetztKind: abgang ? { kindId: abgang.kindId, name: abgang.name, austritt: abgang.austritt } : null,
      };
      break;
    }

    if (gefunden) {
      if (gefunden.ersetztKind) vergebeneAbgaenge.add(gefunden.ersetztKind.kindId);
      vorschlaege.push(gefunden);
      reserviere(gefunden.nachGruppeId, gefunden.abDatum);
    } else if (kind.austritt && austrittMonat !== null && austrittMonat <= letzterMonat && frueh <= austrittMonat) {
      ohnePlatz.push({
        kindId: kind.id,
        name: `${kind.vorname} ${kind.nachname}`,
        vonGruppeName: gruppeName.get(kind.gruppeId as string) ?? "",
        fruehesterTermin: frueh,
        austritt: kind.austritt,
      });
    }
  }

  vorschlaege.sort((a, b) => a.abDatum.localeCompare(b.abDatum) || a.name.localeCompare(b.name, "de"));
  return { vorschlaege, ohnePlatz };
}
