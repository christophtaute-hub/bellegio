/** Datumshilfen für Alters- und Kitajahr-Berechnungen. Nutzt UTC-Daten
 * durchgehend, damit Vergleiche unabhängig von der Server-Zeitzone sind. */

export function parseIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function calculateAge(geburtsdatum: string, today = new Date()): number {
  const birth = parseIsoDate(geburtsdatum);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const hasHadBirthdayThisYear =
    today.getUTCMonth() > birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() >= birth.getUTCDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Ende des laufenden Kitajahres (z.B. 31.08. bei kitaYearStartMonth=9). */
export function kitajahrEnde(today: Date, kitaYearStartMonth: number): Date {
  const currentMonth = today.getUTCMonth() + 1;
  const year =
    currentMonth >= kitaYearStartMonth
      ? today.getUTCFullYear() + 1
      : today.getUTCFullYear();
  const startOfNextKitajahr = new Date(
    Date.UTC(year, kitaYearStartMonth - 1, 1)
  );
  const endOfCurrentKitajahr = new Date(startOfNextKitajahr);
  endOfCurrentKitajahr.setUTCDate(endOfCurrentKitajahr.getUTCDate() - 1);
  return endOfCurrentKitajahr;
}

export type AustrittWarnung = "rot" | "hellrot" | null;

/**
 * rot: Austritt in den nächsten 3 Monaten.
 * hellrot: Austritt später, aber noch im laufenden Kitajahr.
 */
export function austrittWarnung(
  austritt: string | null,
  kitaYearStartMonth: number,
  today = new Date()
): AustrittWarnung {
  if (!austritt) return null;
  const austrittDate = parseIsoDate(austritt);

  const in3Monaten = new Date(today);
  in3Monaten.setUTCMonth(in3Monaten.getUTCMonth() + 3);
  if (austrittDate <= in3Monaten) return "rot";

  if (austrittDate <= kitajahrEnde(today, kitaYearStartMonth)) return "hellrot";

  return null;
}

/**
 * rot: Vertrag/Buchung läuft in den nächsten 3 Monaten aus.
 * Analog zu austrittWarnung, aber ohne Kitajahr-Bezug — eine Verlängerung
 * kann jederzeit im Jahr anstehen, nicht nur zum Kitajahreswechsel.
 */
export function verlaengerungWarnung(
  vertragGueltigBis: string | null,
  today = new Date()
): "rot" | null {
  if (!vertragGueltigBis) return null;
  const gueltigBisDate = parseIsoDate(vertragGueltigBis);

  const in3Monaten = new Date(today);
  in3Monaten.setUTCMonth(in3Monaten.getUTCMonth() + 3);
  if (gueltigBisDate <= in3Monaten) return "rot";

  return null;
}

/** Immer tt.mm.jjjj mit führenden Nullen — toLocaleDateString("de-DE") lässt
 * sie sonst je nach Laufzeitumgebung weg (z.B. "27.9.2020" statt
 * "27.09.2020"), was Tabellenspalten unvorhersehbar breit macht. */
export function formatDate(value: string | null): string {
  if (!value) return "–";
  const date = parseIsoDate(value);
  const tag = String(date.getUTCDate()).padStart(2, "0");
  const monat = String(date.getUTCMonth() + 1).padStart(2, "0");
  const jahr = date.getUTCFullYear();
  return `${tag}.${monat}.${jahr}`;
}

/** Alter in Jahren als Dezimalzahl, z.B. 2.7 — Grundlage für
 * calculateAgeDecimal (Anzeige) und die Gruppen-Passungs-Einschätzung. */
export function calculateAgeYears(
  geburtsdatum: string,
  today = new Date()
): number {
  const birth = parseIsoDate(geburtsdatum);
  const ageInYears =
    (today.getTime() - birth.getTime()) / (365.25 * 86_400_000);
  return Math.max(0, ageInYears);
}

/** Alter mit einer Nachkommastelle, z.B. "2,7 Jahre". Nur für die Anzeige —
 * die BayKiBiG-Altersschwellen-Logik (Platzwert-Berechnung) läuft komplett
 * in SQL und nutzt diese Funktion nicht. */
export function calculateAgeDecimal(
  geburtsdatum: string,
  today = new Date()
): string {
  return calculateAgeYears(geburtsdatum, today).toLocaleString("de-DE", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function toIsoDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}
