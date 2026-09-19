import { bewertePassung, type PassungsEinschaetzung } from "@/lib/kinder/gruppen-passung";
import { berechneAuswaertigenQuote } from "@/lib/kinder/auswaertigen-quote";

export type VorschauKind = {
  id: string;
  vorname: string;
  nachname: string;
  geburtsdatum: string;
  geschlecht: string;
  status: string;
  gruppeId: string | null;
  eintritt: string | null;
  austritt: string | null;
  wohnort: string | null;
};

export type VorschauGruppe = {
  id: string;
  name: string;
  gruppenart: string;
  sollplatze: number;
};

export type VorschauZelle = {
  /** Erster Tag des Monats (YYYY-MM-01) — zugleich der Stichtag der Zählung. */
  monat: string;
  belegt: number;
  /** Nachrücker/geplante Kinder, die in diesem Monat bereits eingetreten wären. */
  nachrueckerGeplant: number;
  frei: number;
};

export type VorschauZeile = { gruppe: VorschauGruppe; zellen: VorschauZelle[] };

export type NachrueckerVorschlag = {
  kindId: string;
  name: string;
  score: number;
  einschaetzung: PassungsEinschaetzung;
  geplanteGruppeGleich: boolean;
  eintritt: string | null;
  ueberAuswaertigenQuote: boolean;
};

export type FreiwerdenderPlatz = {
  monat: string;
  gruppeId: string;
  gruppeName: string;
  anzahl: number;
  abgaenge: { name: string; austritt: string }[];
  /** Nachrücker, die für diese Gruppe bereits zu diesem Monat eingeplant sind. */
  bereitsEingeplant: { kindId: string; name: string; eintritt: string }[];
  vorschlaege: NachrueckerVorschlag[];
};

export type AuswaertigenConfig = { standortGemeinde: string; quoteProzent: number };

const GEPLANTE_STATUS = ["nachruecker", "geplant"];

function istAnwesend(kind: VorschauKind, monat: string): boolean {
  return kind.eintritt !== null && kind.eintritt <= monat && (kind.austritt === null || kind.austritt > monat);
}

function monatsListe(start: string, anzahl: number): string[] {
  const [jahr, m] = start.split("-").map(Number);
  return Array.from({ length: anzahl }, (_, i) => new Date(Date.UTC(jahr, m - 1 + i, 1)).toISOString().slice(0, 10));
}

function vorherigerMonat(monat: string): string {
  const [jahr, m] = monat.split("-").map(Number);
  return new Date(Date.UTC(jahr, m - 2, 1)).toISOString().slice(0, 10);
}

export function berechneBelegungsVorschau(
  gruppen: VorschauGruppe[],
  kinder: VorschauKind[],
  startMonat: string,
  monatsAnzahl: number,
  auswaertigen?: AuswaertigenConfig
): { zeilen: VorschauZeile[]; freiwerdende: FreiwerdenderPlatz[] } {
  const monate = monatsListe(startMonat, monatsAnzahl);
  const aktive = kinder.filter((k) => k.status === "aktiv");
  const geplante = kinder.filter((k) => GEPLANTE_STATUS.includes(k.status));

  const zeilen: VorschauZeile[] = gruppen.map((gruppe) => ({
    gruppe,
    zellen: monate.map((monat) => {
      const belegt = aktive.filter((k) => k.gruppeId === gruppe.id && istAnwesend(k, monat)).length;
      const nachrueckerGeplant = geplante.filter((k) => k.gruppeId === gruppe.id && istAnwesend(k, monat)).length;
      return { monat, belegt, nachrueckerGeplant, frei: gruppe.sollplatze - belegt };
    }),
  }));

  const freiwerdende: FreiwerdenderPlatz[] = [];
  for (const zeile of zeilen) {
    for (let i = 1; i < monate.length; i++) {
      const monat = monate[i];
      const zuwachs = zeile.zellen[i].frei - zeile.zellen[i - 1].frei;
      if (zuwachs <= 0) continue;
      // Nur relevant, wenn die Gruppe vorher (inkl. eingeplanter Nachrücker) voll war —
      // sonst ist ohnehin Platz und der Austritt ändert für Nachrücker nichts.
      const effektivFreiVorher = zeile.zellen[i - 1].frei - zeile.zellen[i - 1].nachrueckerGeplant;
      if (effektivFreiVorher > 0) continue;

      const vorher = vorherigerMonat(monat);
      const abgaenge = aktive
        .filter((k) => k.gruppeId === zeile.gruppe.id && k.austritt !== null && k.austritt > vorher && k.austritt <= monat)
        .map((k) => ({ name: `${k.vorname} ${k.nachname}`, austritt: k.austritt as string }));
      const bereitsEingeplant = geplante
        .filter((k) => k.gruppeId === zeile.gruppe.id && k.eintritt !== null && k.eintritt > vorher && k.eintritt <= monat && istAnwesend(k, monat))
        .map((k) => ({ kindId: k.id, name: `${k.vorname} ${k.nachname}`, eintritt: k.eintritt as string }));
      const nochOffen = zuwachs - bereitsEingeplant.length;

      const anwesendeAktive = aktive.filter((k) => k.gruppeId === zeile.gruppe.id && istAnwesend(k, monat));
      const gruppeFuerPassung = {
        id: zeile.gruppe.id,
        name: zeile.gruppe.name,
        gruppenart: zeile.gruppe.gruppenart,
        sollplatze: zeile.gruppe.sollplatze,
        aktiveKinder: anwesendeAktive.map((k) => ({ geschlecht: k.geschlecht })),
      };
      const alleAnwesendenWohnorte = aktive.filter((k) => istAnwesend(k, monat)).map((k) => k.wohnort);

      const vorschlaege =
        nochOffen <= 0
          ? []
          : geplante
              // Wer zu diesem Monat schon eingetreten ist, hat seinen Platz.
              .filter((k) => !istAnwesend(k, monat))
              .map((k) => {
                const passung = bewertePassung(
                  { geburtsdatum: k.geburtsdatum, geschlecht: k.geschlecht },
                  gruppeFuerPassung,
                  new Date(`${monat}T00:00:00Z`)
                );
                const quote =
                  auswaertigen && k.wohnort
                    ? berechneAuswaertigenQuote(k.wohnort, alleAnwesendenWohnorte, auswaertigen.standortGemeinde, auswaertigen.quoteProzent)
                    : null;
                return {
                  kindId: k.id,
                  name: `${k.vorname} ${k.nachname}`,
                  score: passung.score,
                  einschaetzung: passung.einschaetzung,
                  geplanteGruppeGleich: k.gruppeId === zeile.gruppe.id,
                  eintritt: k.eintritt,
                  ueberAuswaertigenQuote: quote?.ueberschreitetNachher ?? false,
                } satisfies NachrueckerVorschlag;
              })
              .filter((v) => v.einschaetzung !== "schlecht")
              .sort(
                (a, b) =>
                  Number(b.geplanteGruppeGleich) - Number(a.geplanteGruppeGleich) ||
                  b.score - a.score ||
                  (a.eintritt ?? "9999").localeCompare(b.eintritt ?? "9999")
              )
              .slice(0, 2);

      freiwerdende.push({
        monat,
        gruppeId: zeile.gruppe.id,
        gruppeName: zeile.gruppe.name,
        anzahl: zuwachs,
        abgaenge,
        bereitsEingeplant,
        vorschlaege,
      });
    }
  }
  freiwerdende.sort((a, b) => a.monat.localeCompare(b.monat) || a.gruppeName.localeCompare(b.gruppeName, "de"));

  return { zeilen, freiwerdende };
}
