import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { AVV_VERSION } from "@/lib/rechtstexte/version";
import { Abschnitt, Angabe, Platzhalter, RechtstextSeite } from "@/components/legal/bausteine";

export default async function AvvPage() {
  const b = await ladeBetreiberOeffentlich(await createClient());

  return (
    <RechtstextSeite titel="Auftragsverarbeitungsvertrag (Art. 28 DSGVO)" stand={AVV_VERSION} entwurf={!b.rechtstexte_geprueft}>
      <Abschnitt titel="Parteien">
        <p>
          <strong>Verantwortlicher:</strong> der Träger, der Bellegio nutzt (Kunde), vertreten durch die zustimmende Träger-Administration.
          <br />
          <strong>Auftragsverarbeiter:</strong> <Angabe wert={b.firmenname} name="Firmenname" />, <span className="whitespace-pre-line"><Angabe wert={b.anschrift} name="Anschrift" /></span> (Bellegio).
        </p>
        <p>
          Der Vertrag kommt zustande, wenn eine zur Vertretung des Trägers berechtigte Person ihm in der Anwendung zustimmt. Zeitpunkt und Version der Zustimmung
          werden gespeichert.
        </p>
      </Abschnitt>

      <Abschnitt titel="1. Gegenstand und Dauer">
        <p>
          Bellegio verarbeitet im Auftrag des Kunden personenbezogene Daten im Rahmen der Bereitstellung der Anwendung (Belegung, Personal, Controlling). Der
          Vertrag gilt, solange der Kunde die Anwendung nutzt, und endet mit dem Nutzungsvertrag.
        </p>
      </Abschnitt>

      <Abschnitt titel="2. Art, Zweck und Umfang der Verarbeitung">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Speichern, Auswerten und Anzeigen der vom Kunden erfassten Daten sowie Export auf Veranlassung des Kunden.</li>
          <li>
            <strong>Betroffene Kinder:</strong> Name, Geburtsdatum, Geschlecht, Gruppe, Status, Ein- und Austritt, Buchungszeit, Wohnort, Notizen sowie{" "}
            <strong>I-Status (Angabe zum Förder- bzw. Integrationsbedarf — Gesundheitsdaten nach Art. 9 DSGVO)</strong>.
          </li>
          <li>
            <strong>Beschäftigte:</strong> Name, Rolle, Qualifikationskategorie, Wochenstunden, Ein- und Austritt sowie Ausfallzeiten (mit Art des Ausfalls, u. a.
            Krankheit — Gesundheitsdaten nach Art. 9 DSGVO).
          </li>
          <li><strong>Nutzer der Anwendung:</strong> Name, E-Mail-Adresse, Rolle, Berechtigungen.</li>
        </ul>
        <p>Der Kunde erfasst nur Daten, die er für die beschriebenen Zwecke benötigt (Datenminimierung).</p>
      </Abschnitt>

      <Abschnitt titel="3. Weisungen">
        <p>
          Bellegio verarbeitet die Daten ausschließlich auf dokumentierte Weisung des Kunden; die Bedienung der Anwendung durch den Kunden gilt als Weisung. Hält
          Bellegio eine Weisung für rechtswidrig, weist es den Kunden darauf hin.
        </p>
      </Abschnitt>

      <Abschnitt titel="4. Vertraulichkeit">
        <p>Personen, die Zugriff auf die Daten haben, sind zur Vertraulichkeit verpflichtet.</p>
      </Abschnitt>

      <Abschnitt titel="5. Technische und organisatorische Maßnahmen">
        <p>
          Bellegio setzt die in der Anlage beschriebenen <Link href="/tom" className="text-primary underline">technischen und organisatorischen Maßnahmen</Link>{" "}
          um und entwickelt sie im Rahmen des Stands der Technik weiter.
        </p>
      </Abschnitt>

      <Abschnitt titel="6. Unterauftragnehmer">
        <p>
          Der Kunde stimmt dem Einsatz der in der <Link href="/unterauftragnehmer" className="text-primary underline">Liste der Unterauftragnehmer</Link> genannten
          Dienstleister zu. Über beabsichtigte Änderungen informiert Bellegio den Kunden mindestens{" "}
          <Platzhalter>Vorankündigungsfrist festlegen, z. B. 30 Tage</Platzhalter> vorher; der Kunde kann aus wichtigem datenschutzrechtlichem Grund widersprechen.
          Bellegio verpflichtet Unterauftragnehmer vertraglich auf ein vergleichbares Datenschutzniveau.
        </p>
      </Abschnitt>

      <Abschnitt titel="7. Unterstützung des Verantwortlichen">
        <p>
          Bellegio unterstützt den Kunden bei der Beantwortung von Anfragen betroffener Personen. Die Anwendung bietet dafür Funktionen zur Auskunft
          (Art. 15 DSGVO), zum Löschen und zum Anonymisieren. Bellegio unterstützt außerdem bei Datenschutz-Folgenabschätzungen und der Zusammenarbeit mit
          Aufsichtsbehörden, soweit sie die Verarbeitung im Auftrag betreffen.
        </p>
      </Abschnitt>

      <Abschnitt titel="8. Meldung von Datenschutzverletzungen">
        <p>
          Bellegio meldet dem Kunden Verletzungen des Schutzes personenbezogener Daten unverzüglich, spätestens innerhalb von{" "}
          <Platzhalter>Meldefrist festlegen, z. B. 24 Stunden</Platzhalter> nach Bekanntwerden, mit den zur Meldung nach Art. 33 DSGVO nötigen Angaben.
        </p>
      </Abschnitt>

      <Abschnitt titel="9. Ort der Verarbeitung und Drittlandbezug">
        <p>
          Die Datenbank liegt in Frankfurt am Main. Soweit Unterauftragnehmer ihren Sitz oder Konzernbezug außerhalb der EU haben, stellt Bellegio die
          Rechtmäßigkeit der Übermittlung durch geeignete Garantien sicher (z. B. Standardvertragsklauseln).
        </p>
      </Abschnitt>

      <Abschnitt titel="10. Rückgabe und Löschung">
        <p>
          Bei Vertragsende kann der Kunde seine Daten exportieren. Bellegio löscht die Daten des Kunden nach Vertragsende innerhalb von{" "}
          <Platzhalter>Löschfrist nach Vertragsende festlegen, z. B. 30 Tage</Platzhalter>, soweit keine gesetzliche Aufbewahrungspflicht besteht.
        </p>
      </Abschnitt>

      <Abschnitt titel="11. Nachweise und Kontrollen">
        <p>
          Bellegio stellt dem Kunden die zum Nachweis der Pflichten erforderlichen Informationen zur Verfügung und ermöglicht Überprüfungen, einschließlich
          Inspektionen, nach angemessener Vorankündigung.
        </p>
      </Abschnitt>

      <Abschnitt titel="12. Haftung">
        <p>Die Haftung richtet sich nach Art. 82 DSGVO und den <Link href="/agb" className="text-primary underline">AGB</Link>.</p>
      </Abschnitt>
    </RechtstextSeite>
  );
}
