import {
  findeSpalten,
  normalisiere,
  parseDatum,
  parseZahl,
  textWert,
  type RohZeile,
  type SpaltenSynonyme,
} from "@/lib/import/hilfen";
import { TEAM_ROLLE_OPTIONS } from "@/lib/constants";
import type { ImportZeilenStatus } from "@/lib/import/kinder";

export type TeamFeld =
  | "vorname"
  | "nachname"
  | "rolle"
  | "kategorie"
  | "wochenstunden"
  | "gruppe"
  | "status"
  | "eintritt"
  | "austritt";

export const TEAM_SPALTEN: SpaltenSynonyme<TeamFeld> = {
  vorname: ["Vorname", "Rufname"],
  nachname: ["Nachname", "Familienname"],
  rolle: ["Rolle", "Funktion", "Position", "Berufsbezeichnung"],
  kategorie: ["Kategorie", "Qualifikation", "Rollenkategorie", "FK/EK"],
  wochenstunden: ["Wochenstunden", "Stunden", "Std./Woche", "Std Woche", "Arbeitszeit", "Wochenarbeitszeit"],
  gruppe: ["Gruppe", "Gruppenname"],
  status: ["Status"],
  eintritt: ["Eintritt", "Eintrittsdatum", "Beginn"],
  austritt: ["Austritt", "Austrittsdatum", "Ende"],
};

export const TEAM_PFLICHTSPALTEN: TeamFeld[] = ["vorname", "nachname", "wochenstunden"];

const SPALTENNAME: Record<TeamFeld, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  rolle: "Rolle",
  kategorie: "Kategorie",
  wochenstunden: "Wochenstunden",
  gruppe: "Gruppe",
  status: "Status",
  eintritt: "Eintritt",
  austritt: "Austritt",
};

export type TeamRoleCategory = "fk" | "ek" | "ak" | "nicht_paed" | "sprachfoerderung" | "hausmeister" | "hauswirtschaft";

export type TeamImportKontext = {
  gruppen: { id: string; name: string }[];
  vorhandene: { vorname: string; nachname: string }[];
};

export type TeamImportDaten = {
  vorname: string;
  nachname: string;
  rolle: string;
  role_category: TeamRoleCategory;
  wochenstunden: number;
  gruppe_id: string | null;
  status: "aktiv" | "inaktiv" | "geplant";
  eintritt: string | null;
  austritt: string | null;
};

export type TeamImportZeile = {
  zeile: number;
  status: ImportZeilenStatus;
  meldungen: string[];
  anzeige: string;
  mitglied?: TeamImportDaten;
};

export type TeamImportErgebnis = {
  fehlendeSpalten: string[];
  erkannteSpalten: { feld: TeamFeld; quelle: string }[];
  zeilen: TeamImportZeile[];
  uebernehmbar: number;
  mitWarnung: number;
  fehler: number;
  duplikate: number;
};

const STANDARD_ROLLE: Record<TeamRoleCategory, string> = {
  fk: "Pädagogische Fachkraft (Erzieher/in)",
  ek: "Pädagogische Ergänzungskraft (Kinderpfleger/in)",
  ak: "Praktikant/in",
  nicht_paed: "Sonstige",
  sprachfoerderung: "Sonstige",
  hausmeister: "Sonstige",
  hauswirtschaft: "Hauswirtschaft/Verwaltung",
};

/** Kategorie aus einer ausdrücklichen Angabe (FK, Ergänzungskraft, Hausmeister …). */
export function parseKategorie(wert: unknown): TeamRoleCategory | null {
  const t = normalisiere(wert);
  if (!t) return null;
  if (["fk", "fachkraft", "erzieher", "erzieherin", "paedagogische fachkraft"].includes(t)) return "fk";
  if (["ek", "ergaenzungskraft", "kinderpfleger", "kinderpflegerin", "paedagogische ergaenzungskraft"].includes(t)) return "ek";
  if (["ak", "assistenzkraft", "assistenz"].includes(t)) return "ak";
  if (["nicht paedagogisch", "nicht paed", "np"].includes(t)) return "nicht_paed";
  if (t.includes("sprachfoerder")) return "sprachfoerderung";
  if (t.includes("hausmeister")) return "hausmeister";
  if (t.includes("hauswirtschaft")) return "hauswirtschaft";
  return null;
}

/** Leitet die Kategorie aus der Rollenbezeichnung ab, wenn keine ausdrücklich angegeben ist. */
export function kategorieAusRolle(rolle: string): TeamRoleCategory | null {
  const t = normalisiere(rolle);
  if (!t) return null;
  if (t.includes("ergaenzung") || t.includes("kinderpfleg")) return "ek";
  if (t.includes("praktikant") || t.includes("fsj") || t.includes("bfd") || t.includes("assistenz")) return "ak";
  if (t.includes("hauswirtschaft") || t.includes("verwaltung")) return "hauswirtschaft";
  if (t.includes("hausmeister")) return "hausmeister";
  if (t.includes("sprachfoerder")) return "sprachfoerderung";
  if (t.includes("fachkraft") || t.includes("erzieher") || t.includes("paedagog") || t.includes("leitung")) return "fk";
  return null;
}

function kanonischeRolle(rolle: string): string {
  const t = normalisiere(rolle);
  const treffer = TEAM_ROLLE_OPTIONS.find((option) => normalisiere(option) === t);
  return treffer ?? rolle;
}

function parseTeamStatus(wert: unknown): TeamImportDaten["status"] | null {
  const t = normalisiere(wert);
  if (["aktiv", "beschaeftigt"].includes(t)) return "aktiv";
  if (["inaktiv", "ausgeschieden", "ruhend"].includes(t)) return "inaktiv";
  if (["geplant", "vorgesehen"].includes(t)) return "geplant";
  return null;
}

/** Prüft alle Zeilen einer Personal-Datei. Schreibt nichts. */
export function pruefeTeamImport(rows: RohZeile[], kontext: TeamImportKontext): TeamImportErgebnis {
  const ueberschriften = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const spalten = findeSpalten(ueberschriften, TEAM_SPALTEN);
  const fehlendeSpalten = TEAM_PFLICHTSPALTEN.filter((f) => !spalten[f]).map((f) => SPALTENNAME[f]);
  if (!spalten.rolle && !spalten.kategorie) fehlendeSpalten.push("Rolle oder Kategorie");
  const erkannteSpalten = (Object.keys(spalten) as TeamFeld[])
    .filter((f) => spalten[f])
    .map((f) => ({ feld: f, quelle: spalten[f] as string }));

  const leer: TeamImportErgebnis = {
    fehlendeSpalten,
    erkannteSpalten,
    zeilen: [],
    uebernehmbar: 0,
    mitWarnung: 0,
    fehler: 0,
    duplikate: 0,
  };
  if (fehlendeSpalten.length > 0) return leer;

  const wert = (zeile: RohZeile, feld: TeamFeld) => {
    const quelle = spalten[feld];
    return quelle ? zeile[quelle] : null;
  };
  const gruppeNachName = new Map(kontext.gruppen.map((g) => [normalisiere(g.name), g]));
  const schluessel = (v: string, n: string) => `${normalisiere(v)}|${normalisiere(n)}`;
  const vorhanden = new Set(kontext.vorhandene.map((m) => schluessel(m.vorname, m.nachname)));
  const imImport = new Set<string>();

  const zeilen: TeamImportZeile[] = rows.map((roh, index) => {
    const meldungen: string[] = [];
    const fehler: string[] = [];
    const vorname = textWert(wert(roh, "vorname"));
    const nachname = textWert(wert(roh, "nachname"));
    const anzeige = [vorname, nachname].filter(Boolean).join(" ") || "(ohne Namen)";

    if (!vorname) fehler.push("Vorname fehlt.");
    if (!nachname) fehler.push("Nachname fehlt.");

    const stunden = parseZahl(wert(roh, "wochenstunden"));
    if (stunden === null) fehler.push("Wochenstunden fehlen oder sind keine Zahl.");
    else if (!(stunden > 0 && stunden <= 60)) fehler.push("Wochenstunden müssen zwischen 0 und 60 liegen.");

    const rolleRoh = textWert(wert(roh, "rolle"));
    const kategorieRoh = textWert(wert(roh, "kategorie"));
    let kategorie: TeamRoleCategory | null = null;
    if (kategorieRoh) {
      kategorie = parseKategorie(kategorieRoh);
      if (!kategorie) fehler.push(`Kategorie „${kategorieRoh}“ nicht erkannt (Fachkraft, Ergänzungskraft, Assistenzkraft, nicht-pädagogisch …).`);
    } else if (rolleRoh) {
      kategorie = kategorieAusRolle(rolleRoh);
      if (kategorie) meldungen.push(`Kategorie aus der Rolle abgeleitet: ${kategorie === "fk" ? "Fachkraft" : kategorie === "ek" ? "Ergänzungskraft" : kategorie}.`);
      else fehler.push("Die Kategorie (Fachkraft/Ergänzungskraft …) lässt sich aus der Rolle nicht ableiten — bitte in der Spalte „Kategorie“ angeben.");
    } else {
      fehler.push("Rolle oder Kategorie fehlt.");
    }
    const rolle = rolleRoh ? kanonischeRolle(rolleRoh) : kategorie ? STANDARD_ROLLE[kategorie] : "";

    const eintritt = parseDatum(wert(roh, "eintritt"));
    if (eintritt.fehler) fehler.push(`Eintritt: ${eintritt.fehler}`);
    const austritt = parseDatum(wert(roh, "austritt"));
    if (austritt.fehler) fehler.push(`Austritt: ${austritt.fehler}`);
    if (eintritt.iso && austritt.iso && austritt.iso <= eintritt.iso) fehler.push("Der Austritt liegt nicht nach dem Eintritt.");

    const statusRoh = textWert(wert(roh, "status"));
    let status: TeamImportDaten["status"] = "aktiv";
    if (statusRoh) {
      const s = parseTeamStatus(statusRoh);
      if (!s) fehler.push(`Status „${statusRoh}“ nicht erkannt (aktiv, inaktiv oder geplant).`);
      else status = s;
    }

    const gruppeRoh = textWert(wert(roh, "gruppe"));
    let gruppeId: string | null = null;
    if (gruppeRoh) {
      const g = gruppeNachName.get(normalisiere(gruppeRoh));
      if (g) gruppeId = g.id;
      else fehler.push(`Gruppe „${gruppeRoh}“ gibt es nicht (vorhanden: ${kontext.gruppen.map((x) => x.name).join(", ") || "noch keine angelegt"}).`);
    }

    let duplikat = false;
    if (fehler.length === 0) {
      const key = schluessel(vorname, nachname);
      if (vorhanden.has(key)) {
        duplikat = true;
        meldungen.unshift("Diese Person ist in der Einrichtung bereits vorhanden — wird übersprungen.");
      } else if (imImport.has(key)) {
        duplikat = true;
        meldungen.unshift("Diese Person steht in der Datei mehrfach — nur die erste Zeile wird übernommen.");
      } else {
        imImport.add(key);
      }
    }

    const zeilennummer = index + 2;
    if (fehler.length > 0) return { zeile: zeilennummer, status: "fehler", meldungen: fehler, anzeige };
    if (duplikat) return { zeile: zeilennummer, status: "duplikat", meldungen: meldungen.slice(0, 1), anzeige };

    return {
      zeile: zeilennummer,
      status: meldungen.length > 0 ? "warnung" : "ok",
      meldungen,
      anzeige,
      mitglied: {
        vorname,
        nachname,
        rolle,
        role_category: kategorie!,
        wochenstunden: stunden!,
        gruppe_id: gruppeId,
        status,
        eintritt: eintritt.iso,
        austritt: austritt.iso,
      },
    };
  });

  return {
    ...leer,
    zeilen,
    uebernehmbar: zeilen.filter((z) => z.mitglied).length,
    mitWarnung: zeilen.filter((z) => z.status === "warnung").length,
    fehler: zeilen.filter((z) => z.status === "fehler").length,
    duplikate: zeilen.filter((z) => z.status === "duplikat").length,
  };
}
