import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";

const BUNDESLAND_LABEL: Record<string, string> = {
  by: "Bayern",
  bw: "Baden-Württemberg",
  nrw: "Nordrhein-Westfalen",
};

const BAYERN_QUELLEN = [
  {
    label: "§ 17 AVBayKiBiG (Anstellungsschlüssel, Fachkraftquote)",
    href: "https://www.gesetze-bayern.de/Content/Document/BayAVKiBiG-17",
  },
  {
    label: "§ 24 AVBayKiBiG (Buchungszeitfaktoren)",
    href: "https://www.gesetze-bayern.de/Content/Document/BayAVKiBiG-24",
  },
  {
    label: "Art. 21 BayKiBiG (Kindbezogene Förderung, Gewichtungsfaktoren)",
    href: "https://www.gesetze-bayern.de/Content/Document/BayKiBiG-21",
  },
];

const BW_QUELLEN = [
  {
    label: "KiTaVO Baden-Württemberg §1 (Mindestpersonalschlüssel)",
    href: "https://km.baden-wuerttemberg.de/fileadmin/redaktion/m-km/intern/PDF/Gesetze_und_Verordnungen/KiTaVO_konsolidierte-Fassung-2023_barrierefrei.pdf",
  },
  {
    label: "KVJS-Rundschreiben 14/2021, Anlage 2 (Ausführungshinweise + Berechnungshilfe)",
    href: "https://www.kvjs.de/fileadmin/dateien/jugend/Arbeitshilfen_Formulare_Rundschreiben_Newsletter_Tagungsunterlagen/Rundschreiben/Rundschreiben_2021/RS_14-2021_Anlage_2_-_Ausfuehrungshinweise_zur_KiTaVO_und_Berechnungshilfe_zum_Personalbedarf_der_Kindertagesbetreuung_in_Baden-Wuerttemberg.pdf",
  },
];

const NRW_QUELLEN = [
  {
    label: "KiBiz NRW, Stand 01.08.2022 (Volltext)",
    href: "https://www.mkjfgfi.nrw/system/files/media/document/file/kibiz-mit-stand-vom-01.08.2022.pdf",
  },
  {
    label: "recht.nrw.de — KiBiz",
    href: "https://recht.nrw.de/lrgv/gesetz/01082022-gesetz-zur-fruehen-bildung-und-foerderung-von-kindern-kinderbildungsgesetz/",
  },
  {
    label: "PersVO NRW vom 06.12.2024 (Qualifikation, Personalschlüssel)",
    href: "https://recht.nrw.de/lrgv/rechtsverordnung/06122024-verordnung-zu-den-grundsaetzen-ueber-die-qualifikation-und-den/",
  },
];

function Quelle({ label, href }: { label: string; href: string }) {
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline-offset-2 hover:underline"
      >
        {label}
      </a>
    </li>
  );
}

function AktuelleEinrichtungBadge({ bundesland }: { bundesland: string }) {
  return (
    <span className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
      Deine aktive Einrichtung rechnet nach: {BUNDESLAND_LABEL[bundesland] ?? bundesland}
    </span>
  );
}

export default async function DokumentationPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("vollzeit_wochenstunden, empfohlener_anstellungsschluessel, bundesland_code")
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  const bundeslandCode = einrichtung?.bundesland_code ?? "by";
  const vollzeitWochenstunden = Number(einrichtung?.vollzeit_wochenstunden ?? 39);
  const empfohlenerSchluessel = Number(
    einrichtung?.empfohlener_anstellungsschluessel ?? 10.0
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Berechnungsgrundlage: Personalbemessung
        </h1>
        <p className="text-sm text-muted-foreground">
          Wie Bellegio den Personalbedarf je Bundesland berechnet, mit
          Quellenangaben — damit ihr die Zahl nachrechnen und bei Bedarf mit
          eurem Jugendamt abgleichen könnt.
        </p>
        {einrichtungId ? <AktuelleEinrichtungBadge bundesland={bundeslandCode} /> : null}
      </div>

      <section className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
        <h2 className="font-heading text-lg text-primary">
          Bayern, Baden-Württemberg und NRW rechnen strukturell verschieden
        </h2>
        <p className="text-sm text-muted-foreground">
          Das ist keine Vereinfachung von Bellegio, sondern entspricht den
          tatsächlichen Gesetzen: Bayern gewichtet jedes Kind einzeln nach
          Alter und vergleicht die Summe mit den Vollzeitäquivalenten (VZÄ)
          des Personals. Baden-Württemberg gibt stattdessen einen festen
          VZÄ-Sollwert je Gruppentyp vor — die Kinderzahl selbst geht in die
          Formel gar nicht ein. NRW wiederum legt feste Personal-Wochenstunden
          je Gruppenform und Buchungszeit-Band fest. Wer zwischen Bundesländern
          vergleicht, sollte diesen Unterschied im Blick behalten.
        </p>
      </section>

      {/* Bayern */}
      {bundeslandCode === "by" ? (
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl text-primary">Bayern</h2>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Formel</h3>
          <div className="flex flex-col gap-2 font-mono text-sm">
            <p>gewichtete Kinderzahl = Σ Gewichtungsfaktor je Kind</p>
            <p>VZÄ (Personal) = Wochenstunden ÷ Vollzeit-Referenz</p>
            <p className="font-semibold text-primary">
              Anstellungsschlüssel = gewichtete Kinderzahl ÷ VZÄ ≤ 11,0
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Gewichtungsfaktoren nach Art. 21 Abs. 5 BayKiBiG: Kinder unter drei
            Jahren 2,0 · Kinder von drei Jahren bis Schuleintritt 1,0 ·
            Schulkinder 1,2 · Hort 1,3 · Migrationskind 1,3 ·
            Integrationskinder 4,5. Ist ein Kind mehreren Kategorien
            zuzuordnen, zählt ausschließlich der höchste zutreffende Faktor —
            nie die Summe.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Fachkraftquote</h3>
          <div className="flex flex-col gap-2 font-mono text-sm">
            <p>
              gewichtete Kinderzahl (Fachkraftquote) = wie oben, aber
              Integrationskinder ohne den Faktor 4,5
            </p>
            <p className="font-semibold text-primary">
              Soll-Fachkraft-VZÄ = 0,5 × (gewichtete Kinderzahl (Fachkraftquote)
              ÷ 11,0)
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            § 17 Abs. 2 AVBayKiBiG: mindestens 50 % der erforderlichen
            Arbeitszeit des pädagogischen Personals muss von pädagogischen
            Fachkräften geleistet werden. Der Gewichtungsfaktor für
            Integrationskinder wird für diese Berechnung ausdrücklich nicht
            angesetzt.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
          <h3 className="font-heading text-lg text-primary">
            Wichtiger Hinweis zur Quellenlage
          </h3>
          <p className="text-sm text-muted-foreground">
            Der Gesetzestext selbst (§ 17 AVBayKiBiG) spricht von
            &bdquo;Buchungszeitstunden&ldquo;, ohne den genauen Umrechnungsweg
            zu VZÄ und ohne einen expliziten Bezug auf den
            Buchungszeitfaktor aus § 24 AVBayKiBiG zu nennen. Ein offizielles,
            durchgerechnetes Beispiel des Sozialministeriums konnten wir nicht
            auffinden. Diese Implementierung folgt der Lesart, die von zwei
            unabhängigen Kita-Fachquellen bestätigt wird (der
            Buchungszeitfaktor fließt <em>nicht</em> in den
            Anstellungsschlüssel ein, gerechnet wird mit VZÄ statt mit rohen
            Wochenstunden) und die bei einer Plausibilitätsprüfung mit echten
            Einrichtungsdaten sinnvolle Werte ergab — eine wörtliche
            Buchungszeitfaktor-Variante ergab dagegen einen unplausiblen
            Schlüssel. Wir empfehlen dennoch, den berechneten Wert einmal mit
            eurem zuständigen Jugendamt oder Steuerberater abzugleichen.
          </p>
          <p className="text-sm text-muted-foreground">
            Ebenfalls nicht amtlich bestätigt: ein &bdquo;empfohlener
            Schlüssel von 1:10&ldquo; ist keine belegbare gesetzliche Vorgabe —
            gesetzlich verbindlich ist ausschließlich 1:11,0. Bellegio führt
            diesen Wert daher als frei einstellbare, klar als eigene
            Zielgröße gekennzeichnete Kennzahl (Standard 10,0
            {bundeslandCode === "by"
              ? `, aktuell ${empfohlenerSchluessel.toLocaleString("de-DE")}`
              : ""}
            ), nicht als gesetzliche Grenze.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">
            Eigenes Rechenbeispiel
          </h3>
          <p className="text-sm text-muted-foreground">
            Zur Nachvollziehbarkeit — kein amtliches Beispiel, sondern selbst
            gerechnet:
          </p>
          <div className="flex flex-col gap-1 font-mono text-sm">
            <p>12 Kinder unter drei Jahren × 2,0 = 24,0</p>
            <p>36 Kinder Ü3 bis Schuleintritt × 1,0 = 36,0</p>
            <p className="font-semibold">gewichtete Kinderzahl = 24,0 + 36,0 = 60,0</p>
            <p className="mt-2">
              5,0 VZÄ pädagogisches Personal (bei einer Vollzeit-Referenz von{" "}
              {bundeslandCode === "by" ? vollzeitWochenstunden : 39} Std./Woche)
            </p>
            <p className="font-semibold text-primary">
              Anstellungsschlüssel = 60,0 ÷ 5,0 = 12,0 → 1:12,0
            </p>
            <p className="text-muted-foreground">
              12,0 &gt; 11,0 → Mindestschlüssel nicht erfüllt, zusätzliches
              Personal oder eine Anpassung der Buchungszeiten wäre nötig.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Quellen</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {BAYERN_QUELLEN.map((q) => (
              <Quelle key={q.href} {...q} />
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {/* Baden-Württemberg */}
      {bundeslandCode === "bw" ? (
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl text-primary">Baden-Württemberg</h2>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Formel</h3>
          <p className="text-sm text-muted-foreground">
            Kein Anstellungsschlüssel, keine Gewichtung pro Kind. §1 KiTaVO
            legt für jede Betriebsform (bei Referenz-Öffnungszeit) einen
            festen VZÄ-Sollwert fest; weicht die tatsächliche Öffnungszeit
            ab, wird linear skaliert.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40">
                  <th className="p-2 text-left">Betriebsform</th>
                  <th className="p-2 text-right">Referenz-Öffnungszeit</th>
                  <th className="p-2 text-right">Referenz-VZÄ</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b">
                  <td className="p-2">Halbtagsgruppe, ohne Altersmischung</td>
                  <td className="p-2 text-right">4 Std./Tag</td>
                  <td className="p-2 text-right">1,3</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Halbtagsgruppe, mit Altersmischung U3</td>
                  <td className="p-2 text-right">4 Std./Tag</td>
                  <td className="p-2 text-right">1,4</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Regelgruppe, ohne Altersmischung</td>
                  <td className="p-2 text-right">6 Std./Tag</td>
                  <td className="p-2 text-right">1,8</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Regelgruppe, mit Altersmischung U3</td>
                  <td className="p-2 text-right">6 Std./Tag</td>
                  <td className="p-2 text-right">2,0</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Verlängerte Öffnungszeit, ohne AM</td>
                  <td className="p-2 text-right">6 Std./Tag</td>
                  <td className="p-2 text-right">1,9</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Verlängerte Öffnungszeit, mit AM</td>
                  <td className="p-2 text-right">6 Std./Tag</td>
                  <td className="p-2 text-right">2,0</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">Ganztagsgruppe</td>
                  <td className="p-2 text-right">7 Std./Tag</td>
                  <td className="p-2 text-right">2,3</td>
                </tr>
                <tr>
                  <td className="p-2">Kinderkrippe (≥15 Std./Woche)</td>
                  <td className="p-2 text-right">7 Std./Tag</td>
                  <td className="p-2 text-right">2,06</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="font-mono text-sm font-semibold text-primary">
            Soll-VZÄ = Referenz-VZÄ + (Öffnungszeit − Referenz-Öffnungszeit) ×
            Stellen/Std.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
          <h3 className="font-heading text-lg text-primary">
            Wichtiger Hinweis zur Quellenlage
          </h3>
          <p className="text-sm text-muted-foreground">
            Direkt vorgerechnet durch das KVJS-Rundschreiben ist nur die
            Regelgruppe ohne Altersmischung (1,8 VZÄ ÷ 6 Std. = 0,300
            Stellen/Std.). Die übrigen Betriebsformen folgen erkennbar
            derselben linearen Regel, sind aber nicht einzeln
            primärquellenbestätigt. Fachkraftquote: es gibt keine
            Prozent-Vorgabe wie in Bayern — Basis ist faktisch 100 %
            Fachkraft (§7 KiTaG), dessen genauer Wortlaut hier nur über eine
            Sekundärquelle bestätigt werden konnte. Eine befristete
            20-%-Ausnahmeregelung (§1a KiTaVO) ist zum 31.08.2025
            ausgelaufen — vor Verlass auf diese Zahlen prüfen, ob eine
            Nachfolgeregelung existiert. Integrationskind/Kinder mit
            Behinderung: §1 Abs. 2 KiTaVO schließt den Mehrbedarf
            ausdrücklich vom Mindestpersonalschlüssel aus — es gibt keinen
            Gewichtungsfaktor wie Bayerns 4,5, sondern eine Einzelfallprüfung
            plus separate Eingliederungshilfe (SGB IX/SGB VIII).
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Quellen</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {BW_QUELLEN.map((q) => (
              <Quelle key={q.href} {...q} />
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {/* NRW */}
      {bundeslandCode === "nrw" ? (
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl text-primary">Nordrhein-Westfalen</h2>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Formel</h3>
          <p className="text-sm text-muted-foreground">
            Ebenfalls keine Gewichtung pro Kind. Die Anlage zu § 33 Abs. 1
            KiBiz legt feste Personal-Wochenstunden je Gruppenform (I/II/III)
            und Buchungszeit-Band fest; das Alter der Kinder wird
            ausschließlich über die Gruppenform abgebildet (GF II = reine
            Krippe, GF I = altersgemischt, GF III = reine Ü3) — nicht über
            einen Faktor pro Kind.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-secondary/40">
                  <th className="p-2 text-left">Gruppenform</th>
                  <th className="p-2 text-right">25 Std./Wo.</th>
                  <th className="p-2 text-right">35 Std./Wo.</th>
                  <th className="p-2 text-right">45 Std./Wo.</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                <tr className="border-b">
                  <td className="p-2">
                    GF I (2 J.–Schuleintritt, gemischt, max. 20)
                  </td>
                  <td className="p-2 text-right">55 Std. FK</td>
                  <td className="p-2 text-right">77 Std. FK</td>
                  <td className="p-2 text-right">99 Std. FK</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">GF II (U3-Krippe, max. 10)</td>
                  <td className="p-2 text-right">55 Std. FK</td>
                  <td className="p-2 text-right">77 Std. FK</td>
                  <td className="p-2 text-right">99 Std. FK</td>
                </tr>
                <tr>
                  <td className="p-2">GF III (Ü3, max. 25/20)</td>
                  <td className="p-2 text-right">27,5 FK + 27,5 EK</td>
                  <td className="p-2 text-right">38,5 FK + 38,5 EK</td>
                  <td className="p-2 text-right">49,5 FK + 49,5 EK</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground">
            Zusätzlich Leitungsfreistellung je Gruppe: +5 / +7 / +9 Std. je
            Buchungszeit-Band (§29 Abs. 2 KiBiz).
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
          <h3 className="font-heading text-lg text-primary">
            Wichtiger Hinweis zur Quellenlage
          </h3>
          <p className="text-sm text-muted-foreground">
            Die Stunden-Tabelle stammt aus Praktiker-Quellen (Kitazentrale),
            nicht direkt aus der Primär-PDF der Anlage zu § 33 KiBiz — die
            Textextraktion aus dem offiziellen PDF ist an eingebetteten
            Schriftarten gescheitert. Vor einer echten Kunden-Einrichtung in
            NRW sollte die Tabelle mit dem Original abgeglichen werden. Die
            Leitungsfreistellung (+5/+7/+9 Std.) wurde hier einheitlich auf
            alle drei Gruppenformen angewendet, da unklar blieb, für welche
            Gruppenform(en) genau sie in welcher Höhe gilt. Eine
            KiBiz-Reform wurde am 16.07.2026 verabschiedet
            (Kernzeit/Randzeit-Flexibilisierung, temporäre
            Gruppengrößen-Ausnahmen) — ob sie die Stundentabelle selbst
            verändert, ist unklar. Fachkraftquote: keine landesweite
            Prozent-Vorgabe gefunden, nur die qualitative Mindestbesetzung
            (§28 Abs. 1: immer mindestens eine Fachkraft anwesend, ab mehr
            als 60 Kindern eine zweite Fachkraft). Integrationskind/Kinder
            mit (drohender) Behinderung: §26 Abs. 3 KiBiz verlangt nur
            qualitativ, den besonderen Bedarf zu berücksichtigen — kein
            Gewichtungsfaktor wie Bayerns 4,5, sondern eine erhöhte
            Kindpauschale (Förderung) und ggf. separate
            Eingliederungshilfe/KiTa-Assistenz.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Quellen</h3>
          <ul className="flex flex-col gap-1 text-sm">
            {NRW_QUELLEN.map((q) => (
              <Quelle key={q.href} {...q} />
            ))}
          </ul>
        </div>
      </section>
      ) : null}

      {/* Jahreskategorisierung */}
      <section className="flex flex-col gap-6">
        <h2 className="font-heading text-2xl text-primary">
          Jährliche Kategorisierung (Kinder- und Jugendhilfestatistik)
        </h2>

        <div className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h3 className="font-heading text-lg text-primary">Bänder</h3>
          <p className="text-sm text-muted-foreground">
            Controlling ordnet einmal jährlich (Stichtag 1. März, analog zum
            amtlichen Erhebungsstichtag der Kinder- und
            Jugendhilfestatistik) jedes aktive Kind nach vertraglich
            vereinbarter wöchentlicher Betreuungszeit einem Band zu: 10 bis
            unter 15 · 15 bis unter 20 · 20 bis unter 25 · 25 bis unter 30 ·
            30 bis unter 35 · 35 bis unter 40 · 40 bis unter 45 · 45 bis
            unter 50 · 50 bis unter 55 · 55 Std. und mehr, jeweils mit einer
            Spalte für Kinder mit (drohender) Behinderung.
          </p>
          <p className="text-sm text-muted-foreground">
            In Bayern wird die wöchentliche Stundenzahl aus der täglichen
            Buchungszeit-Band-Spanne abgeleitet (Mittelwert × 5
            Betreuungstage) — eine Näherung, da nur die tägliche Buchungszeit
            erfasst wird. In Baden-Württemberg und NRW gibt es keine
            Pro-Kind-Stundenerfassung; dort wird ersatzweise die
            Öffnungszeit bzw. Buchungszeit-Stunden der Gruppe verwendet, der
            das Kind zugeordnet ist.
          </p>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
          <h3 className="font-heading text-lg text-primary">
            Wichtiger Hinweis zur Quellenlage
          </h3>
          <p className="text-sm text-muted-foreground">
            Es gibt kein bundesweit einheitliches Stundenraster für diese
            Meldung — Meldebögen unterscheiden sich je Bundesland und
            teils je Kommune (Hamburg nutzt z.B. bis 10 / 11–20 / 21–25 /
            26–30 / 31–40 / 41+ Std., andere Grenzen als hier). Die oben
            genannten Bänder in 5-Std.-Schritten sind daher als Vorgabe
            übernommen und nicht durch eine bundesweit gültige Primärquelle
            bestätigt — vor der ersten echten Meldung unbedingt mit dem
            eigenen Jugendamt bzw. Statistischen Landesamt abgleichen, ob
            diese Bänder dem tatsächlich verwendeten Meldebogen entsprechen.
          </p>
        </div>
      </section>
    </div>
  );
}
