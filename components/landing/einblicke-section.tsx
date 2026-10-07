import { Reveal } from "@/components/landing/reveal";

const EINBLICKE = [
  {
    kategorie: "Personalschlüssel",
    titel: "Warum der Schlüssel plötzlich kippt",
    text: "Ein einziger Austritt reicht: Im Beispiel sinkt das Personal von 5,8 auf 4,3 VZÄ — aus 1 : 9,2 wird 1 : 12,2. Bellegio zeigt dir den Monat, in dem das passiert, schon Monate vorher.",
  },
  {
    kategorie: "Landesrecht",
    titel: "Kein Bundesland rechnet wie das andere",
    text: "Beispiele: Bayern gewichtet jedes Kind, Baden-Württemberg gibt feste Sollwerte je Betriebsform vor, NRW feste Stunden je Gruppenform. Bellegio rechnet immer nach dem Recht deiner Einrichtung — und erklärt die Formel mit Quelle.",
  },
  {
    kategorie: "Landesrecht ändert sich",
    titel: "Ausnahmeregelung mit Ablaufdatum",
    text: "Beispiel Baden-Württemberg: Die Erleichterungen nach §1a KiTaVO (u.a. bis zu 20 % weniger Personal in Ausnahmefällen) gelten aktuell bis zum 31.08.2027. Ab dem 01.09.2027 gelten wieder die regulären Sollwerte.",
  },
  {
    kategorie: "Belegung",
    titel: "Auswärtige Kinder im Blick",
    text: "In manchen Kommunen (Beispiel Baden-Württemberg) begrenzen lokale Satzungen den Anteil auswärtiger Kinder. Bellegio zeigt dir beim Anlegen, wie sich die Quote verändert — als Hinweis, nie als Sperre.",
  },
  {
    kategorie: "Statistik",
    titel: "I-Status sichtbar machen",
    text: "Kinder mit I-Status tauchen in der Kategorisierung nach Wochenstunden als eigene Zeile auf — für jeden Monat des Jahres und in jedem Bundesland.",
  },
  {
    kategorie: "Förderung nach Landesrecht",
    titel: "Der Basiswert hat ein Plus",
    text: "Beispiel Bayern: Der jährliche staatliche Förderbetrag je Kind ist Basiswert plus Qualitätsbonus mal Buchungszeit- mal Gewichtungsfaktor. Bellegio rechnet das je Kind und zeigt dir den Monatswert.",
  },
  {
    kategorie: "Pauschalen nach Landesrecht",
    titel: "Die Pauschale ist nicht dein Einkommen",
    text: "Beispiel NRW: Die Kindpauschale stellt die anerkennungsfähigen Gesamtkosten dar, die Land, Jugendamt, Träger und Eltern gemeinsam tragen. Bellegio kennzeichnet das Ergebnis deshalb ausdrücklich als Planungsgröße.",
  },
  {
    kategorie: "Controlling",
    titel: "Zwei Stundenzahlen, die man verwechselt",
    text: "Ungewichtete Buchungsstunden summieren die Buchungszeitfaktoren, gewichtete multiplizieren zusätzlich den Gewichtungsfaktor. Der Anstellungsschlüssel nutzt dagegen die gewichtete Kinderzahl ohne Buchungszeit. Bellegio zeigt alle drei getrennt.",
  },
  {
    kategorie: "Nachvollziehbarkeit",
    titel: "Jede Änderung hat einen Absender",
    text: "Bei Kindern und Personal protokolliert Bellegio, wer wann was geändert hat — und du druckst den Verlauf mit einem Klick aus.",
  },
];

export function EinblickeSection() {
  return (
    <section id="einblicke" className="scroll-mt-16 py-20 md:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <p className="text-sm font-medium tracking-wide text-primary uppercase">Einblicke</p>
          <h2 className="font-heading mt-4 max-w-3xl text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
            Was Kita-Controlling wirklich schwierig macht.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {EINBLICKE.map((e, i) => (
            <Reveal key={e.titel} delay={(i % 3) * 80}>
              <article className="flex h-full flex-col gap-3 rounded-3xl bg-secondary/60 p-7">
                <p className="text-xs font-medium tracking-wide text-primary uppercase">{e.kategorie}</p>
                <h3 className="font-heading text-xl leading-snug font-semibold">{e.titel}</h3>
                <p className="text-sm text-muted-foreground">{e.text}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
