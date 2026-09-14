export type FreierSlot = {
  gruppeId: string;
  gruppeName: string;
  gruppenart: string;
  monat: string;
  anzahlFrei: number;
};

export type WartelisteKind = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  gewuenschteBetreuungsart: string | null;
  gewuenschterEintritt: string | null;
  erstelltAm: string;
};

export type SlotMitVorschlaegen = {
  slot: FreierSlot;
  vorschlaege: WartelisteKind[];
};

function alterAmStichtagInJahren(geburtsdatum: string, stichtag: string): number {
  const geboren = new Date(geburtsdatum);
  const stich = new Date(stichtag);
  let alter = stich.getUTCFullYear() - geboren.getUTCFullYear();
  const monatDiff = stich.getUTCMonth() - geboren.getUTCMonth();
  if (monatDiff < 0 || (monatDiff === 0 && stich.getUTCDate() < geboren.getUTCDate())) {
    alter -= 1;
  }
  return alter;
}

/**
 * Passt das Alter eines Kindes zu Monat `monat` zur Gruppenart? Krippe = unter
 * drei Jahre, Kindergarten = drei Jahre bis Schuleintritt (hier: ab drei
 * Jahren, ohne separate Schuleintritt-Prüfung — konsistent mit der
 * bestehenden Platzwert-Logik). Hort/Altersgemischt: keine Alterseinschränkung.
 */
function altersPasstZuGruppenart(
  geburtsdatum: string,
  gruppenart: string,
  monat: string
): boolean {
  if (gruppenart === "hort" || gruppenart === "altersgemischt") return true;
  const alter = alterAmStichtagInJahren(geburtsdatum, monat);
  if (gruppenart === "krippe") return alter < 3;
  if (gruppenart === "kindergarten") return alter >= 3;
  return true;
}

function betreuungsartPasst(
  gewuenschteBetreuungsart: string | null,
  gruppenart: string
): boolean {
  if (!gewuenschteBetreuungsart) return true;
  if (gewuenschteBetreuungsart === "altersgemischt" || gruppenart === "altersgemischt") {
    return true;
  }
  return gewuenschteBetreuungsart === gruppenart;
}

/**
 * Ordnet jedem frei werdenden Platz passende Wartelisten-Kinder zu:
 * Alter passt zur Gruppenart, gewünschte Betreuungsart passt (falls
 * angegeben), gewünschtes Eintrittsdatum liegt nicht nach dem Monat des
 * frei werdenden Platzes. Sortiert nach Wartezeit — ältester Eintrag
 * (frühestes erstelltAm) zuerst.
 */
export function matchKinderToFreieSlots(
  freieSlots: FreierSlot[],
  wartelisteKinder: WartelisteKind[]
): SlotMitVorschlaegen[] {
  return freieSlots.map((slot) => {
    const vorschlaege = wartelisteKinder
      .filter((kind) => altersPasstZuGruppenart(kind.geburtsdatum, slot.gruppenart, slot.monat))
      .filter((kind) => betreuungsartPasst(kind.gewuenschteBetreuungsart, slot.gruppenart))
      .filter(
        (kind) =>
          !kind.gewuenschterEintritt || kind.gewuenschterEintritt <= slot.monat
      )
      .sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm))
      .slice(0, slot.anzahlFrei);

    return { slot, vorschlaege };
  });
}
