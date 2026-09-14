import { createClient } from "@/lib/supabase/server";
import { getActiveEinrichtungId } from "@/lib/server/active-einrichtung";

const QUELLEN = [
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

export default async function DokumentationPage() {
  const einrichtungId = await getActiveEinrichtungId();
  const supabase = await createClient();

  const { data: einrichtung } = einrichtungId
    ? await supabase
        .from("einrichtungen")
        .select("vollzeit_wochenstunden, empfohlener_anstellungsschluessel")
        .eq("id", einrichtungId)
        .single()
    : { data: null };

  const vollzeitWochenstunden = Number(einrichtung?.vollzeit_wochenstunden ?? 39);
  const empfohlenerSchluessel = Number(
    einrichtung?.empfohlener_anstellungsschluessel ?? 10.0
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-heading text-3xl tracking-tight text-primary">
          Berechnungsgrundlage: Anstellungsschlüssel (Bayern)
        </h1>
        <p className="text-sm text-muted-foreground">
          Wie Bellegio den Anstellungsschlüssel und die Fachkraftquote
          berechnet, mit Quellenangaben — damit ihr die Zahl nachrechnen und
          bei Bedarf mit eurem Jugendamt abgleichen könnt.
        </p>
      </div>

      <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Formel</h2>
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
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Fachkraftquote</h2>
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
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-accent bg-accent/10 p-6">
        <h2 className="font-heading text-lg text-primary">
          Wichtiger Hinweis zur Quellenlage
        </h2>
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
          Zielgröße gekennzeichnete Kennzahl (Standard 10,0, aktuell{" "}
          {empfohlenerSchluessel.toLocaleString("de-DE")}), nicht als
          gesetzliche Grenze.
        </p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">
          Eigenes Rechenbeispiel
        </h2>
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
            {vollzeitWochenstunden} Std./Woche)
          </p>
          <p className="font-semibold text-primary">
            Anstellungsschlüssel = 60,0 ÷ 5,0 = 12,0 → 1:12,0
          </p>
          <p className="text-muted-foreground">
            12,0 &gt; 11,0 → Mindestschlüssel nicht erfüllt, zusätzliches
            Personal oder eine Anpassung der Buchungszeiten wäre nötig.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">Quellen</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {QUELLEN.map((q) => (
            <Quelle key={q.href} {...q} />
          ))}
        </ul>
      </section>
    </div>
  );
}
