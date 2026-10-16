export type MassnahmenBereich = "belegung" | "personal";

/** Ein-Klick-Vorschläge je Ampel. „sonstige“ erlaubt einen freien Titel. */
export const MASSNAHMEN_VORSCHLAEGE: Record<MassnahmenBereich, { typ: string; titel: string }[]> = {
  belegung: [
    { typ: "nachruecker", titel: "Nachrücker prüfen" },
    { typ: "interner_wechsel", titel: "Interne Wechsel prüfen" },
    { typ: "warteliste", titel: "Warteliste kontaktieren" },
    { typ: "info_nachmittag", titel: "Info-Nachmittag veranstalten" },
    { typ: "meta_anzeige", titel: "Facebook/Meta-Anzeige starten" },
    { typ: "marketing", titel: "Sonstige Marketingmaßnahme" },
  ],
  personal: [
    { typ: "stunden_aufstocken", titel: "Stunden aufstocken" },
    { typ: "stelle_ausschreiben", titel: "Stelle ausschreiben" },
    { typ: "befristung_verlaengern", titel: "Befristung verlängern" },
    { typ: "springer", titel: "Springer/Leasing prüfen" },
    { typ: "aufnahme_verschieben", titel: "Aufnahmen zeitlich strecken" },
  ],
};

export type Massnahme = {
  id: string;
  bereich: MassnahmenBereich;
  typ: string;
  titel: string;
  notiz: string | null;
  zielMonat: string | null;
  status: "offen" | "erledigt";
  erstelltVon: string | null;
  erstelltAm: string;
  erledigtVon: string | null;
  erledigtAm: string | null;
};
