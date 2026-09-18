/** Vorname für Begrüßungen, mit Fallback-Kette full_name → Profil-E-Mail → Auth-E-Mail. */
export function computeVorname(
  fullName: string | null | undefined,
  profileEmail: string | null | undefined,
  userEmail: string | null | undefined
): string | null {
  return (
    fullName?.trim().split(/\s+/)[0] ??
    profileEmail?.split("@")[0] ??
    userEmail?.split("@")[0] ??
    null
  );
}
