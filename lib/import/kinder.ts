import {
  alterInJahren,
  findeSpalten,
  normalisiere,
  normalisiereBand,
  parseDatum,
  parseJaNein,
  textWert,
  type RohZeile,
  type SpaltenSynonyme,
} from "@/lib/import/hilfen";

export type KindFeld =
  | "vorname"
  | "nachname"
  | "geburtsdatum"
  | "geschlecht"
  | "gruppe"
  | "status"
  | "eintritt"
  | "austritt"
  | "buchungszeit"
  | "istatus"
  | "wohnort"
  | "notizen"
  | "gewichtung"
  | "platznummer"
  | "vertrag_bis";

export const KIND_SPALTEN: SpaltenSynonyme<KindFeld> = {
  vorname: ["Vorname", "Rufname"],
  nachname: ["Nachname", "Familienname"],
  geburtsdatum: ["Geburtsdatum", "Geburtstag", "Geb.-Datum", "Geb Datum", "Geboren", "Geb."],
  geschlecht: ["Geschlecht", "m/w/d", "Sex"],
  gruppe: ["Gruppe", "Gruppenname"],
  status: ["Status"],
  eintritt: ["Eintritt", "Eintrittsdatum", "Aufnahme", "Aufnahmedatum", "Beginn"],
  austritt: ["Austritt", "Austrittsdatum", "Abgang", "Ende"],
  buchungszeit: ["Buchungszeit", "Zeitk.", "Zeitkategorie", "Betreuungszeit", "Buchung"],
  istatus: ["I-Status", "I Status", "I-Kind", "Integration", "Integrationskind", "Inklusion"],
  wohnort: ["Wohnort", "Gemeinde"],
  notizen: ["Notizen", "Notiz", "Bemerkung", "Bemerkungen", "Anmerkung"],
  gewichtung: ["Gewichtung", "Gewichtungsfaktor", "Faktor"],
  platznummer: ["Platznummer", "Platz-Nr.", "Platz Nr", "Platz"],
  vertrag_bis: ["Vertrag gültig bis", "Vertragsende", "Vertrag bis"],
};

export const KIND_PFLICHTSPALTEN: KindFeld[] = ["vorname", "nachname", "geburtsdatum", "geschlecht"];

export type KindImportKontext = {
  bundeslandCode: string;
  gruppen: { id: string; name: string }[];
  baender: { id: string; label: string }[];
  gewichtungen: { id: string; code: string; label: string }[];
  vorhandene: { vorname: string; nachname: string; geburtsdatum: string }[];
  heute: string;
};

export type KindImportDaten = {
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: "maennlich" | "weiblich" | "divers" | "keine_angabe";
  status: "aktiv" | "nachruecker" | "geplant";
  gruppe_id: string | null;
  platznummer: string | null;
  eintritt: string | null;
  austritt: string | null;
  vertrag_gueltig_bis: string | null;
  buchungszeit_band_id: string | null;
  wohnort: string | null;
  notizen: string | null;
  hat_behinderung: boolean;
  weighting_factor_ids: string[];
};

export type ImportZeilenStatus = "ok" | "warnung" | "fehler" | "duplikat";

export type KindImportZeile = {
  /** Zeilennummer in der Datei, wie sie in Excel steht (Kopfzeile = 1). */
  zeile: number;
  status: ImportZeilenStatus;
  meldungen: string[];
  anzeige: string;
  kind?: KindImportDaten;
};

export type KindImportErgebnis = {
  fehlendeSpalten: string[];
  erkannteSpalten: { feld: KindFeld; quelle: string }[];
  zeilen: KindImportZeile[];
  uebernehmbar: number;
  mitWarnung: number;
  fehler: number;
  duplikate: number;
};

const SPALTENNAME: Record<KindFeld, string> = {
  vorname: "Vorname",
  nachname: "Nachname",
  geburtsdatum: "Geburtsdatum",
  geschlecht: "Geschlecht",
  gruppe: "Gruppe",
  status: "Status",
  eintritt: "Eintritt",
  austritt: "Austritt",
  buchungszeit: "Buchungszeit",
  istatus: "I-Status",
  wohnort: "Wohnort",
  notizen: "Notizen",
  gewichtung: "Gewichtung",
  platznummer: "Platznummer",
  vertrag_bis: "Vertrag gültig bis",
};

export function parseGeschlecht(wert: unknown): KindImportDaten["geschlecht"] | null {
  const t = normalisiere(wert);
  if (["m", "maennlich", "junge", "mann", "male"].includes(t)) return "maennlich";
  if (["w", "weiblich", "maedchen", "frau", "female", "f"].includes(t)) return "weiblich";
  if (["d", "divers", "x"].includes(t)) return "divers";
  if (["keine angabe", "k a", "ka", "unbekannt"].includes(t)) return "keine_angabe";
  return null;
}

function parseStatus(wert: unknown): KindImportDaten["status"] | null {
  const t = normalisiere(wert);
  if (["aktiv", "belegt"].includes(t)) return "aktiv";
  if (["nachruecker", "nachruecker in", "warteliste", "wartend"].includes(t)) return "nachruecker";
  if (["geplant", "vormerkung"].includes(t)) return "geplant";
  return null;
}

/** Bayern: Gewichtungsfaktoren aus einer Freitext-Angabe („U3“, „Ü3, Migration“). Unbekanntes wird gemeldet. */
function parseGewichtungen(
  wert: unknown,
  faktoren: KindImportKontext["gewichtungen"]
): { ids: string[]; unbekannt: string[] } {
  const ids: string[] = [];
  const unbekannt: string[] = [];
  const nachCode = (code: string) => faktoren.find((f) => f.code === code)?.id;
  for (const teil of String(wert ?? "").split(/[,;/+]/)) {
    const t = normalisiere(teil).replace(/\s/g, "");
    if (!t) continue;
    let id: string | undefined;
    if (/^(u3|unter3|unterdrei|u3kind)/.test(t)) id = nachCode("u3");
    else if (/^(ue3|ab3|3bis|uber3|ueber3|ue3bis)/.test(t)) id = nachCode("ue3_bis_schuleintritt");
    else if (/schul/.test(t)) id = nachCode("schulkinder");
    else if (/integr|inklus|ikind|istatus/.test(t)) id = nachCode("integrationskinder");
    else if (/migr|deutsch|nds/.test(t)) id = nachCode("nicht_deutschsprachig");
    else if (/hort|tagespflege/.test(t)) id = nachCode("tagespflege");
    if (id) {
      if (!ids.includes(id)) ids.push(id);
    } else {
      unbekannt.push(teil.trim());
    }
  }
  return { ids, unbekannt };
}

function schluessel(vorname: string, nachname: string, geburtsdatum: string): string {
  return `${normalisiere(vorname)}|${normalisiere(nachname)}|${geburtsdatum}`;
}

/** Prüft alle Zeilen einer Kinder-Datei gegen die Regeln der App und liefert je Zeile: übernehmbar,
 * mit Hinweis, fehlerhaft oder bereits vorhanden. Schreibt nichts. */
export function pruefeKinderImport(rows: RohZeile[], kontext: KindImportKontext): KindImportErgebnis {
  const ueberschriften = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const spalten = findeSpalten(ueberschriften, KIND_SPALTEN);
  const fehlendeSpalten = KIND_PFLICHTSPALTEN.filter((f) => !spalten[f]).map((f) => SPALTENNAME[f]);
  const erkannteSpalten = (Object.keys(spalten) as KindFeld[])
    .filter((f) => spalten[f])
    .map((f) => ({ feld: f, quelle: spalten[f] as string }));

  const leer: KindImportErgebnis = {
    fehlendeSpalten,
    erkannteSpalten,
    zeilen: [],
    uebernehmbar: 0,
    mitWarnung: 0,
    fehler: 0,
    duplikate: 0,
  };
  if (fehlendeSpalten.length > 0) return leer;

  const wert = (zeile: RohZeile, feld: KindFeld) => {
    const quelle = spalten[feld];
    return quelle ? zeile[quelle] : null;
  };
  const gruppeNachName = new Map(kontext.gruppen.map((g) => [normalisiere(g.name), g]));
  const bandNachLabel = new Map(kontext.baender.map((b) => [normalisiereBand(b.label), b]));
  const vorhanden = new Set(kontext.vorhandene.map((k) => schluessel(k.vorname, k.nachname, k.geburtsdatum)));
  const imImport = new Set<string>();
  const bayern = kontext.bundeslandCode === "by";

  const zeilen: KindImportZeile[] = rows.map((roh, index) => {
    const meldungen: string[] = [];
    const fehler: string[] = [];
    const vorname = textWert(wert(roh, "vorname"));
    const nachname = textWert(wert(roh, "nachname"));
    const anzeige = [vorname, nachname].filter(Boolean).join(" ") || "(ohne Namen)";
    const zeilennummer = index + 2;

    if (!vorname) fehler.push("Vorname fehlt.");
    if (!nachname) fehler.push("Nachname fehlt.");

    const geburt = parseDatum(wert(roh, "geburtsdatum"));
    if (geburt.fehler) fehler.push(`Geburtsdatum: ${geburt.fehler}`);
    else if (!geburt.iso) fehler.push("Geburtsdatum fehlt.");
    else {
      const alter = alterInJahren(geburt.iso, kontext.heute);
      if (geburt.iso > kontext.heute) fehler.push("Das Geburtsdatum liegt in der Zukunft.");
      else if (alter > 18) fehler.push(`Das Geburtsdatum ergibt ein Alter von ${alter} Jahren — bitte prüfen.`);
    }

    const geschlechtRoh = textWert(wert(roh, "geschlecht"));
    const geschlecht = geschlechtRoh ? parseGeschlecht(geschlechtRoh) : null;
    if (!geschlechtRoh) fehler.push("Geschlecht fehlt (männlich, weiblich, divers oder keine Angabe).");
    else if (!geschlecht) fehler.push(`Geschlecht „${geschlechtRoh}“ nicht erkannt (männlich, weiblich, divers oder keine Angabe).`);

    const eintritt = parseDatum(wert(roh, "eintritt"));
    if (eintritt.fehler) fehler.push(`Eintritt: ${eintritt.fehler}`);
    const austritt = parseDatum(wert(roh, "austritt"));
    if (austritt.fehler) fehler.push(`Austritt: ${austritt.fehler}`);
    const vertragBis = parseDatum(wert(roh, "vertrag_bis"));
    if (vertragBis.fehler) fehler.push(`Vertrag gültig bis: ${vertragBis.fehler}`);
    if (eintritt.iso && austritt.iso && austritt.iso <= eintritt.iso) fehler.push("Der Austritt liegt nicht nach dem Eintritt.");

    // Gruppe
    const gruppeRoh = textWert(wert(roh, "gruppe"));
    let gruppeId: string | null = null;
    if (gruppeRoh) {
      const g = gruppeNachName.get(normalisiere(gruppeRoh));
      if (g) gruppeId = g.id;
      else {
        const verfuegbar = kontext.gruppen.map((x) => x.name).join(", ") || "noch keine angelegt";
        fehler.push(`Gruppe „${gruppeRoh}“ gibt es nicht (vorhanden: ${verfuegbar}).`);
      }
    }

    // Status
    const statusRoh = textWert(wert(roh, "status"));
    let status: KindImportDaten["status"] | null = null;
    if (statusRoh) {
      status = parseStatus(statusRoh);
      if (!status) fehler.push(`Status „${statusRoh}“ nicht erkannt (aktiv, Nachrücker oder geplant).`);
    } else if (eintritt.iso && eintritt.iso > kontext.heute) {
      status = "nachruecker";
      meldungen.push("Eintritt liegt in der Zukunft — als Nachrücker übernommen.");
    } else if (gruppeId) {
      status = "aktiv";
    } else if (!gruppeRoh) {
      fehler.push("Bitte eine Gruppe oder einen Status (z. B. Nachrücker) angeben.");
    }

    if (status === "aktiv") {
      if (!gruppeRoh) fehler.push("Aktive Kinder brauchen eine Gruppe.");
      if (!eintritt.iso) fehler.push("Aktive Kinder brauchen ein Eintrittsdatum — ohne Eintritt zählt das Kind in keiner Berechnung.");
    }
    if (status === "nachruecker" && !eintritt.iso) fehler.push("Nachrücker brauchen ein geplantes Eintrittsdatum.");
    if (status === "aktiv" && austritt.iso && austritt.iso <= kontext.heute) {
      meldungen.push("Der Austritt liegt bereits in der Vergangenheit.");
    }

    // Buchungszeit
    const bandRoh = textWert(wert(roh, "buchungszeit"));
    let bandId: string | null = null;
    if (bandRoh) {
      const band = bandNachLabel.get(normalisiereBand(bandRoh));
      if (band) bandId = band.id;
      else {
        const verfuegbar = kontext.baender.map((b) => b.label).join(", ");
        fehler.push(`Buchungszeit „${bandRoh}“ nicht erkannt (möglich: ${verfuegbar}).`);
      }
    } else {
      meldungen.push("Keine Buchungszeit angegeben — das Kind erscheint in der Kategorisierung als „nicht zugeordnet“.");
    }

    // I-Status
    const istatusRoh = wert(roh, "istatus");
    const istatus = parseJaNein(istatusRoh);
    if (istatus === null) fehler.push(`I-Status „${textWert(istatusRoh)}“ nicht erkannt (ja oder nein).`);

    // Gewichtung (nur Bayern)
    let gewichtungIds: string[] = [];
    if (bayern) {
      const gewRoh = textWert(wert(roh, "gewichtung"));
      if (gewRoh) {
        const { ids, unbekannt } = parseGewichtungen(gewRoh, kontext.gewichtungen);
        if (unbekannt.length > 0) fehler.push(`Gewichtung „${unbekannt.join(", ")}“ nicht erkannt (U3, Ü3, Schulkind, Migration, Integration).`);
        gewichtungIds = ids;
      } else if (geburt.iso) {
        const bezug = eintritt.iso && eintritt.iso > kontext.heute ? eintritt.iso : kontext.heute;
        const alter = alterInJahren(geburt.iso, bezug);
        const code = alter < 3 ? "u3" : alter < 6 ? "ue3_bis_schuleintritt" : "schulkinder";
        const faktor = kontext.gewichtungen.find((f) => f.code === code);
        if (faktor) {
          gewichtungIds = [faktor.id];
          meldungen.push(`Gewichtung aus dem Alter abgeleitet: ${faktor.label}.`);
        }
      }
      if (istatus) {
        const integration = kontext.gewichtungen.find((f) => f.code === "integrationskinder");
        if (integration && !gewichtungIds.includes(integration.id)) {
          gewichtungIds.push(integration.id);
          meldungen.push("I-Status: Integrationsfaktor ergänzt.");
        }
      }
    }

    // Dubletten
    let duplikat = false;
    if (fehler.length === 0 && geburt.iso) {
      const key = schluessel(vorname, nachname, geburt.iso);
      if (vorhanden.has(key)) {
        duplikat = true;
        meldungen.unshift("Dieses Kind ist in der Einrichtung bereits vorhanden — wird übersprungen.");
      } else if (imImport.has(key)) {
        duplikat = true;
        meldungen.unshift("Dieses Kind steht in der Datei mehrfach — nur die erste Zeile wird übernommen.");
      } else {
        imImport.add(key);
      }
    }

    if (fehler.length > 0) {
      // Bei Fehlern und Dubletten nur den eigentlichen Grund zeigen, keine Nebenhinweise.
      return { zeile: zeilennummer, status: "fehler", meldungen: fehler, anzeige };
    }
    if (duplikat) return { zeile: zeilennummer, status: "duplikat", meldungen: meldungen.slice(0, 1), anzeige };

    const daten: KindImportDaten = {
      vorname,
      nachname,
      geburtsdatum: geburt.iso!,
      geschlecht: geschlecht!,
      status: status!,
      gruppe_id: gruppeId,
      platznummer: textWert(wert(roh, "platznummer")) || null,
      eintritt: eintritt.iso,
      austritt: austritt.iso,
      vertrag_gueltig_bis: vertragBis.iso,
      buchungszeit_band_id: bandId,
      wohnort: textWert(wert(roh, "wohnort")) || null,
      notizen: textWert(wert(roh, "notizen")) || null,
      hat_behinderung: istatus === true,
      weighting_factor_ids: gewichtungIds,
    };
    return {
      zeile: zeilennummer,
      status: meldungen.length > 0 ? "warnung" : "ok",
      meldungen,
      anzeige,
      kind: daten,
    };
  });

  return {
    ...leer,
    zeilen,
    uebernehmbar: zeilen.filter((z) => z.kind).length,
    mitWarnung: zeilen.filter((z) => z.status === "warnung").length,
    fehler: zeilen.filter((z) => z.status === "fehler").length,
    duplikate: zeilen.filter((z) => z.status === "duplikat").length,
  };
}
