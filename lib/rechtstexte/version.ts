/** Versionen der Vertragsdokumente. Wer einen Text inhaltlich ändert, erhöht die Version — Träger-Administratoren
 * stimmen dann beim nächsten Login erneut zu. */
export const AGB_VERSION = "2026-09-20";
export const AVV_VERSION = "2026-09-20";

export const DOKUMENTE = [
  { key: "agb", label: "Allgemeine Geschäftsbedingungen (AGB)", href: "/agb", version: AGB_VERSION },
  { key: "avv", label: "Auftragsverarbeitungsvertrag (AVV)", href: "/avv", version: AVV_VERSION },
] as const;
