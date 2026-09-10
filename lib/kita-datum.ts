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

export function formatDate(value: string | null): string {
  if (!value) return "–";
  return parseIsoDate(value).toLocaleDateString("de-DE", {
    timeZone: "UTC",
  });
}
