import { stellenText } from "@/lib/ui/status";

export type PlanungGruppe = {
  id: string;
  name: string;
  gruppenart: string;
  sollplaetze: number;
  /** Kinder am Beginn des Vorjahres (Ist). */
  vorjahrKinder: number;
  /** Vorschlag: Kinder zum Beginn des geplanten Kitajahres (Austritte, Schulkinder, feste Nachfolger, geplante Wechsel). */
  vorschlagKinder: number;
  /** Bayern: durchschnittlicher Gewichtungsfaktor der Kinder dieser Gruppe (1 = Regelkind). */
  durchschnittsfaktor: number;
};

export type PlanungEingabe = {
  modell: "bayern" | "bw" | "nrw";
  vollzeitWochenstunden: number;
  gruppen: PlanungGruppe[];
  /** Personal zum Kitajahr-Beginn nach bekannten Austritten, in Wochenstunden. */
  personalIst: number;
  /** Bedarf laut Vorschlag, in Wochenstunden. */
  sollVorschlag: number;
  /** Bayern: nötige Wochenstunden je gewichtetem Kind (aus dem Rechenweg des Vorschlags); sonst null. */
  stundenJeGewichtetemKind: number | null;
};

/** Was die Leitung am Vorschlag ändert (wird gespeichert). */
export type PlanungDaten = {
  kinder: Record<string, number>;
  einstellenGeplant: number;
};

export type PlanungZeile = {
  id: string;
  name: string;
  vorjahr: number;
  plan: number;
  plaetze: number;
  /** Veränderung gegenüber dem Vorjahr. */
  delta: number;
  status: "ok" | "voll" | "frei" | "zuviel";
};

export type PlanungErgebnis = {
  zeilen: PlanungZeile[];
  summe: { vorjahr: number; plan: number; plaetze: number };
  sollPlan: number;
  personalIst: number;
  luecke: number;
  ueberhang: number;
  /** Noch zu besetzende Wochenstunden nach den bereits geplanten Einstellungen. */
  einstellenStunden: number;
  satz: { ton: "ok" | "warnung" | "info"; text: string };
  /** BW/NRW: der Bedarf hängt an Gruppenform/Öffnungszeit, nicht an der Kinderzahl. */
  bedarfOhneKinderbezug: boolean;
};

const stunden = (wert: number) => `${Math.max(1, Math.round(wert)).toLocaleString("de-DE")} Wochenstunden`;

/** Vorschlag und eigene Änderungen → Zahlen je Gruppe, Personalbedarf und ein Satz. Rein und testbar (läuft auch im Browser, damit die
 * Tabelle beim Tippen sofort mitrechnet). Bayern: der Bedarf wächst mit der gewichteten Kinderzahl; BW und NRW rechnen je Gruppe nach
 * Betriebsform bzw. Gruppenform und Buchungszeit — dort ändert die Kinderzahl den Bedarf nicht. */
export function berechnePlanung(eingabe: PlanungEingabe, daten: Partial<PlanungDaten> = {}): PlanungErgebnis {
  const zeilen: PlanungZeile[] = eingabe.gruppen.map((g) => {
    const geplant = daten.kinder?.[g.id];
    const plan = Math.max(0, Math.round(geplant ?? g.vorschlagKinder));
    const status: PlanungZeile["status"] = plan > g.sollplaetze ? "zuviel" : plan === g.sollplaetze ? "voll" : plan >= g.sollplaetze * 0.85 ? "ok" : "frei";
    return { id: g.id, name: g.name, vorjahr: g.vorjahrKinder, plan, plaetze: g.sollplaetze, delta: plan - g.vorjahrKinder, status };
  });
  const summe = zeilen.reduce(
    (s, z) => ({ vorjahr: s.vorjahr + z.vorjahr, plan: s.plan + z.plan, plaetze: s.plaetze + z.plaetze }),
    { vorjahr: 0, plan: 0, plaetze: 0 }
  );

  const bedarfOhneKinderbezug = eingabe.modell !== "bayern" || eingabe.stundenJeGewichtetemKind === null;
  const sollPlan = bedarfOhneKinderbezug
    ? eingabe.sollVorschlag
    : eingabe.gruppen.reduce((s, g, i) => s + zeilen[i].plan * g.durchschnittsfaktor, 0) * (eingabe.stundenJeGewichtetemKind as number);

  const unterschied = sollPlan - eingabe.personalIst;
  const luecke = Math.max(0, unterschied);
  const ueberhang = unterschied < 0 && -unterschied >= Math.max(8, sollPlan * 0.25) ? -unterschied : 0;
  const geplant = Math.max(0, daten.einstellenGeplant ?? 0);
  const einstellenStunden = Math.max(0, Math.ceil(luecke - geplant));
  const v = eingabe.vollzeitWochenstunden;

  let satz: PlanungErgebnis["satz"];
  if (luecke >= 1) {
    satz =
      einstellenStunden > 0
        ? { ton: "warnung", text: `Zum Start fehlen rund ${stunden(luecke)} Personal (${stellenText(luecke, v)}). Es sind noch ${stunden(einstellenStunden)} zu besetzen.` }
        : { ton: "ok", text: `Zum Start fehlen rund ${stunden(luecke)} — mit den geplanten ${stunden(geplant)} Einstellungen passt es.` };
  } else if (ueberhang > 0) {
    satz = { ton: "info", text: `Zum Start habt ihr rund ${stunden(ueberhang)} mehr Personal als nötig (${stellenText(ueberhang, v)}).` };
  } else {
    satz = { ton: "ok", text: "Zum Start passt das Personal zur geplanten Kinderzahl." };
  }

  return { zeilen, summe, sollPlan, personalIst: eingabe.personalIst, luecke, ueberhang, einstellenStunden, satz, bedarfOhneKinderbezug };
}
