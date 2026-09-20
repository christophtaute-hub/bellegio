/** Mindestlänge für alle Passwörter (Einladung, Zurücksetzen, Profil, Admin-Vergabe). */
export const PASSWORT_MIN_LAENGE = 10;

const ZU_EINFACH = new Set([
  "passwort123",
  "password123",
  "passwort1234",
  "password1234",
  "1234567890",
  "0123456789",
  "qwertzuiop",
  "qwertyuiop",
  "bellegio123",
  "bellegio1234",
  "test123456",
]);

/** Einheitliche Passwortregel. Gibt eine deutsche Fehlermeldung zurück oder `null`,
 * wenn das Passwort akzeptiert wird. Die Prüfung gegen bekannte Leaks übernimmt
 * zusätzlich Supabase Auth (Leaked-Password-Protection, Pro-Plan). */
export function pruefePasswort(passwort: string): string | null {
  if (passwort.length < PASSWORT_MIN_LAENGE) {
    return `Das Passwort muss mindestens ${PASSWORT_MIN_LAENGE} Zeichen lang sein.`;
  }
  if (ZU_EINFACH.has(passwort.toLowerCase())) {
    return "Dieses Passwort ist zu leicht zu erraten. Bitte wähle ein anderes.";
  }
  if (/^(.)\1+$/.test(passwort)) {
    return "Das Passwort darf nicht nur aus demselben Zeichen bestehen.";
  }
  return null;
}
