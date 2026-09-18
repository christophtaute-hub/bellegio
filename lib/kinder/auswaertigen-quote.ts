/** Nur für Baden-Württemberg relevant: an manchen Standorten (z.B. Stuttgart,
 * Heidelberg) begrenzt eine lokale kommunale Satzung den Anteil Kinder, die
 * nicht aus der Standort-Gemeinde kommen — rein beratender Hinweis, keine
 * Sperre (siehe GruppenPassungHinweis für dasselbe Muster). */

export type AuswaertigenQuoteErgebnis = {
  anteilVorher: number;
  anteilNachher: number;
  quote: number;
  ueberschreitetNachher: boolean;
};

function berechneAnteil(
  wohnorte: (string | null)[],
  standortGemeinde: string
): number {
  if (wohnorte.length === 0) return 0;
  const auswaertig = wohnorte.filter(
    (w) => w && w.trim().toLowerCase() !== standortGemeinde.trim().toLowerCase()
  ).length;
  return (auswaertig / wohnorte.length) * 100;
}

export function berechneAuswaertigenQuote(
  neuesWohnort: string,
  bestehendeWohnorte: (string | null)[],
  standortGemeinde: string,
  quote: number
): AuswaertigenQuoteErgebnis {
  const anteilVorher = berechneAnteil(bestehendeWohnorte, standortGemeinde);
  const anteilNachher = berechneAnteil([...bestehendeWohnorte, neuesWohnort], standortGemeinde);
  return {
    anteilVorher,
    anteilNachher,
    quote,
    ueberschreitetNachher: anteilNachher > quote,
  };
}
