import { buildKpis, type PresenceRow } from "@/lib/dashboard/presence";
import type { PersonalplanungKontext } from "@/lib/team/personalplanung";
import type { Ampel, TeamPresenceRow } from "@/lib/team/anstellungsschluessel";
import { berechneSollVzaeBW } from "@/lib/team/personalschluessel-bw";
import { findeNRWZeile } from "@/lib/team/personalschluessel-nrw";

export type GruppeEingabe = {
  id: string;
  name: string;
  gruppenart: string;
  sollplatze: number;
  bw_betriebsform: string | null;
  bw_altersmischung: boolean;
  bw_oeffnungszeit_stunden: number | null;
  bw_randzeit_stunden: number | null;
  nrw_gruppenform: string | null;
  nrw_buchungszeit_stunden: number | null;
};

export type GruppenPersonal = {
  /** Wochenstunden des Personals, das dieser Gruppe zugeordnet ist (Fachkräfte + Ergänzungskräfte). */
  istStunden: number;
  /** Benötigte Wochenstunden nach dem Rechenweg des Bundeslands. */
  sollStunden: number;
  /** Nur NRW: getrennt nach Fachkraft und Ergänzungskraft. */
  fk?: { ist: number; soll: number };
  ek?: { ist: number; soll: number };
  /** Nur Bayern: gewichtete Kinderzahl der Gruppe und der daraus folgende Richtwert 1 : x. */
  bayern?: { gewichteteKinder: number; schluessel: number | null };
  ampel: Ampel;
};

export type GruppeStatus = {
  gruppeId: string;
  name: string;
  gruppenart: string;
  sollplaetze: number;
  belegt: number;
  personal: GruppenPersonal;
};

export type GruppenStatusErgebnis = {
  gruppen: GruppeStatus[];
  /** Stunden von Personal ohne Gruppe (Einrichtungsebene). */
  ohneGruppeStunden: number;
  /** Anteil der Personalstunden, der einer Gruppe zugeordnet ist (1 = alle). */
  zuordnungsquote: number;
  /** Nur wenn der überwiegende Teil des Personals Gruppen zugeordnet ist, sind die Gruppenwerte aussagekräftig. */
  belastbar: boolean;
};

/** Ab diesem Anteil zugeordneter Personalstunden gelten die Gruppenwerte als belastbar. */
export const MIN_ZUORDNUNGSQUOTE = 0.8;

function ampelAusStunden(ist: number, soll: number): Ampel {
  if (soll <= 0 || ist >= soll) return "gruen";
  return ist >= soll * 0.9 ? "gelb" : "rot";
}

const stunden = (rows: TeamPresenceRow[], kategorie?: string) =>
  rows.filter((r) => !kategorie || r.role_category === kategorie).reduce((sum, r) => sum + (r.wochenstunden ?? 0), 0);

/** Reine Funktion: Belegung und Personal je Gruppe für einen Zeitpunkt.
 * BW und NRW rechnen den Bedarf je Gruppe (Betriebsform bzw. Gruppenform × Buchungszeit); Bayern kennt den Schlüssel
 * gesetzlich nur für die Einrichtung — der Gruppenwert ist dort ein Richtwert aus der gewichteten Kinderzahl der Gruppe.
 * Personal ohne Gruppe wird nicht verteilt, sondern getrennt ausgewiesen. */
export function berechneGruppenStatus(
  gruppen: GruppeEingabe[],
  kontext: PersonalplanungKontext,
  kinderRows: PresenceRow[],
  teamRows: TeamPresenceRow[]
): GruppenStatusErgebnis {
  const gesamtStunden = stunden(teamRows.filter((r) => ["fk", "ek"].includes(r.role_category ?? "")));
  const ohneGruppe = stunden(teamRows.filter((r) => !r.gruppe_id && ["fk", "ek"].includes(r.role_category ?? "")));
  const zuordnungsquote = gesamtStunden > 0 ? (gesamtStunden - ohneGruppe) / gesamtStunden : 1;

  const ergebnis = gruppen.map((g): GruppeStatus => {
    const mitglieder = teamRows.filter((r) => r.gruppe_id === g.id && ["fk", "ek"].includes(r.role_category ?? ""));
    const kinder = kinderRows.filter((r) => r.gruppe_id === g.id);
    const istStunden = stunden(mitglieder);
    const basis = { gruppeId: g.id, name: g.name, gruppenart: g.gruppenart, sollplaetze: g.sollplatze, belegt: kinder.length };

    if (kontext.modell === "bw") {
      const sollVzae = berechneSollVzaeBW(
        {
          id: g.id,
          name: g.name,
          bwBetriebsform: g.bw_betriebsform,
          bwAltersmischung: g.bw_altersmischung,
          bwOeffnungszeitStunden: g.bw_oeffnungszeit_stunden,
          bwRandzeitStunden: g.bw_randzeit_stunden,
        },
        kontext.tabelle
      );
      const sollStunden = sollVzae * kontext.vollzeitWochenstunden;
      return { ...basis, personal: { istStunden, sollStunden, ampel: ampelAusStunden(istStunden, sollStunden) } };
    }

    if (kontext.modell === "nrw") {
      const zeile = findeNRWZeile(
        { id: g.id, name: g.name, nrwGruppenform: g.nrw_gruppenform, nrwBuchungszeitStunden: g.nrw_buchungszeit_stunden },
        kontext.tabelle
      );
      const sollFk = (zeile?.fachkraftStunden ?? 0) + (zeile?.leitungsfreistellungStunden ?? 0);
      const sollEk = zeile?.ergaenzungskraftStunden ?? 0;
      const istFk = stunden(mitglieder, "fk");
      const istEk = stunden(mitglieder, "ek");
      // Je Gruppe nach dem Anteil des erfüllten Bedarfs (wie bei BW): grün = alles erfüllt, gelb = höchstens 10 % fehlen,
      // sonst rot. (Die Einrichtungs-Ampel in buildNRWPersonalplanung bewertet FK und EK getrennt und kennt nur „eines von beiden erfüllt“.)
      const ampel: Ampel = ampelAusStunden(istFk, sollFk) === "rot" || ampelAusStunden(istEk, sollEk) === "rot"
        ? "rot"
        : ampelAusStunden(istFk, sollFk) === "gelb" || ampelAusStunden(istEk, sollEk) === "gelb"
          ? "gelb"
          : "gruen";
      return {
        ...basis,
        personal: { istStunden, sollStunden: sollFk + sollEk, fk: { ist: istFk, soll: sollFk }, ek: { ist: istEk, soll: sollEk }, ampel },
      };
    }

    const gewichteteKinder = buildKpis(kinder).gewichteteKinderzahl;
    const mindest = kontext.staffingRules.mindestschluessel || 11;
    const sollStunden = (gewichteteKinder / mindest) * kontext.vollzeitWochenstunden;
    const vzae = istStunden / (kontext.vollzeitWochenstunden || 1);
    return {
      ...basis,
      personal: {
        istStunden,
        sollStunden,
        bayern: { gewichteteKinder, schluessel: vzae > 0 ? gewichteteKinder / vzae : null },
        ampel: ampelAusStunden(istStunden, sollStunden),
      },
    };
  });

  return { gruppen: ergebnis, ohneGruppeStunden: ohneGruppe, zuordnungsquote, belastbar: zuordnungsquote >= MIN_ZUORDNUNGSQUOTE };
}

/** Erster kritischer Monat: der erste rote Monat (Engpass); gibt es keinen, der erste gelbe (knapp). `null` = bleibt
 * über den ganzen Zeitraum grün. */
export function ersterKritischerMonat(
  verlauf: { monat: string; ampel: Ampel }[]
): { monat: string; ampel: Ampel } | null {
  return verlauf.find((v) => v.ampel === "rot") ?? verlauf.find((v) => v.ampel === "gelb") ?? null;
}
