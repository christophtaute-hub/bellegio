/** Hinweise zum Rechtsstand für Monate, in denen sich Landesrecht ändert (Stand der Werte: siehe RECHENWERTE_STAND).
 * Die Zahlen davor sind belastbar; danach beruhen sie auf vorläufigen oder noch nicht veröffentlichten Werten. */

export type RechtsstandEingabe = {
  bundeslandCode: string;
  /** Monate des angezeigten Zeitraums (ISO-Daten, jeweils der Erste). */
  monate: string[];
  /** Fördererlöse und Ergebnis sichtbar (Recht „Finanzübersicht“)? Nur dann sind die Förderhinweise relevant. */
  zeigeFinanzen: boolean;
};

export function rechtsstandHinweise({ bundeslandCode, monate, zeigeFinanzen }: RechtsstandEingabe): string[] {
  const hinweise: string[] = [];
  const letzter = monate[monate.length - 1];
  if (!letzter) return hinweise;
  const erster = monate[0];

  if (bundeslandCode === "by" && zeigeFinanzen && letzter >= "2027-01-01") {
    hinweise.push(
      "Ab Januar 2027 gilt die Reform des BayKiBiG: Der Qualitätsbonus (2027 vorläufig 693,28 €, 2028 852,36 €, 2029 857,87 €) ist eingerechnet. Der Basiswert 2027 ist noch nicht bekanntgegeben und mit dem Wert von 2026 fortgeschrieben. Die neue Teamkräftepauschale ist nicht enthalten."
    );
  }
  if (bundeslandCode === "nrw" && letzter >= "2027-08-01") {
    hinweise.push(
      "Ab August 2027 gilt die KiBiz-Reform (Landtagsbeschluss vom 16.07.2026). Die neuen Pauschalen und Personalstunden liegen noch nicht vor — Monate ab August 2027 rechnen mit dem heutigen Recht."
    );
  }
  if (bundeslandCode === "bw" && erster < "2027-09-01") {
    hinweise.push(
      "Bis 31.08.2027 erlaubt § 1a KiTaVO eine Übergangsregel (eine Fachkraft darf durch zwei Zusatzkräfte ersetzt werden, Unterschreitung bis 20 %). Die Berechnung zeigt den Mindestpersonalschlüssel ohne diese Erleichterung."
    );
  }
  return hinweise;
}
