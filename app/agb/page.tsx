import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { AGB_VERSION } from "@/lib/rechtstexte/version";
import { Abschnitt, Angabe, Platzhalter, RechtstextSeite } from "@/components/legal/bausteine";

export default async function AgbPage() {
  const supabase = await createClient();
  const b = await ladeBetreiberOeffentlich(supabase);
  const { data: einstellungen } = await supabase.from("betreiber_einstellungen").select("zahlungsziel_tage").eq("id", true).maybeSingle();

  return (
    <RechtstextSeite titel="Allgemeine Geschäftsbedingungen" stand={AGB_VERSION} entwurf={!b.rechtstexte_geprueft}>
      <Abschnitt titel="1. Geltungsbereich">
        <p>
          Diese Bedingungen gelten für die Nutzung von Bellegio, einer webbasierten Anwendung für Belegung, Personal und Controlling von Kindertageseinrichtungen,
          durch Unternehmer und Träger (nachfolgend „Kunde“). Anbieter ist <Angabe wert={b.firmenname} name="Firmenname" /> (nachfolgend „Bellegio“). Abweichende
          Bedingungen des Kunden gelten nur, wenn Bellegio ihnen ausdrücklich zugestimmt hat.
        </p>
      </Abschnitt>

      <Abschnitt titel="2. Leistung">
        <p>
          Bellegio stellt dem Kunden die Anwendung als Software-as-a-Service über das Internet bereit. Der Leistungsumfang ergibt sich aus der jeweils
          vereinbarten Bestellung und der Leistungsbeschreibung auf der Website: Belegung, Personal, Controlling, Szenario-Rechner sowie die
          zugehörigen Auswertungen und Exporte für die Bundesländer Bayern, Baden-Württemberg und Nordrhein-Westfalen. Bellegio entwickelt die Anwendung
          weiter und darf Funktionen anpassen, soweit der vereinbarte Leistungsumfang nicht wesentlich eingeschränkt wird.
        </p>
      </Abschnitt>

      <Abschnitt titel="3. Planungshilfe, keine Rechts- oder Behördenauskunft">
        <p>
          Die Berechnungen (z. B. Anstellungsschlüssel, Personalbedarf, Kategorisierung) und die Angaben zu gesetzlichen Vorgaben sind eine Planungshilfe. Sie
          beruhen auf den in der Anwendung dokumentierten Rechenwegen und Quellen mit dem dort genannten Stand. Sie ersetzen weder Rechtsberatung noch eine
          verbindliche Auskunft der zuständigen Behörden. Der Kunde bleibt für seine Meldungen, Förderanträge und die Einhaltung gesetzlicher Vorgaben
          selbst verantwortlich und gleicht die Werte vor Meldungen mit der zuständigen Stelle (z. B. Jugendamt, Landesjugendamt) ab.
        </p>
      </Abschnitt>

      <Abschnitt titel="4. Zugang und Pflichten des Kunden">
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>Der Kunde benennt eine Träger-Administration, die Nutzer anlegt und Berechtigungen vergibt.</li>
          <li>Zugangsdaten sind geheim zu halten und dürfen nicht weitergegeben werden. Jeder Nutzer erhält ein eigenes Konto.</li>
          <li>Der Kunde stellt sicher, dass er die Daten der Kinder, Eltern und Beschäftigten rechtmäßig erfasst und verarbeiten darf (z. B. Information der Betroffenen).</li>
          <li>Der Kunde ist für die Richtigkeit und Vollständigkeit der eingegebenen Daten verantwortlich.</li>
        </ul>
      </Abschnitt>

      <Abschnitt titel="5. Vergütung und Zahlung">
        <p>
          Die Vergütung ergibt sich aus der Bestellung bzw. den Preisen auf der <Link href="/#preise" className="text-primary underline">Website</Link>: eine Grundgebühr je
          Einrichtung und ein Preis je Kind und Monat, jeweils netto zuzüglich gesetzlicher Umsatzsteuer. Maßgeblich ist die Zahl der aktiven Einrichtungen und
          Kinder am Ersten des Abrechnungsmonats. Rechnungen sind{" "}
          {einstellungen?.zahlungsziel_tage != null ? `innerhalb von ${einstellungen.zahlungsziel_tage} Tagen` : <Platzhalter>Zahlungsziel festlegen</Platzhalter>} nach Rechnungsdatum
          ohne Abzug zu zahlen.
        </p>
      </Abschnitt>

      <Abschnitt titel="6. Laufzeit und Kündigung">
        <p>
          Der Vertrag läuft auf unbestimmte Zeit und kann von beiden Seiten mit einer Frist von <Platzhalter>Kündigungsfrist festlegen</Platzhalter> zum Ende eines
          Kalendermonats in Textform gekündigt werden. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.{" "}
          <Platzhalter>Testphase und Mindestlaufzeit festlegen oder streichen</Platzhalter>
        </p>
      </Abschnitt>

      <Abschnitt titel="7. Verfügbarkeit und Wartung">
        <p>
          Bellegio bemüht sich um eine hohe Verfügbarkeit der Anwendung. <Platzhalter>Zugesagte Verfügbarkeit in Prozent im Jahresmittel festlegen oder „ohne feste Zusage“ wählen</Platzhalter>{" "}
          Wartungsarbeiten werden nach Möglichkeit außerhalb der üblichen Betreuungszeiten durchgeführt und vorher angekündigt.
        </p>
      </Abschnitt>

      <Abschnitt titel="8. Datenschutz und Auftragsverarbeitung">
        <p>
          Der Kunde ist für die Kita-Daten Verantwortlicher im Sinne der DSGVO, Bellegio ist Auftragsverarbeiter. Die Einzelheiten regelt der{" "}
          <Link href="/avv" className="text-primary underline">Auftragsverarbeitungsvertrag</Link> mit den{" "}
          <Link href="/tom" className="text-primary underline">technischen und organisatorischen Maßnahmen</Link> und der{" "}
          <Link href="/unterauftragnehmer" className="text-primary underline">Liste der Unterauftragnehmer</Link>. Er wird mit der Zustimmung der Träger-Administration
          zu diesen Bedingungen Vertragsbestandteil.
        </p>
      </Abschnitt>

      <Abschnitt titel="9. Rechte an den Daten">
        <p>
          Die vom Kunden eingegebenen Daten bleiben sein Eigentum. Der Kunde kann seine Daten jederzeit über die Export-Funktionen der Anwendung entnehmen.
          Bellegio nutzt sie nur zur Erbringung der Leistung. Die Anwendung selbst, ihre Rechenwege und Dokumentation bleiben Eigentum von Bellegio; der Kunde
          erhält ein einfaches, nicht übertragbares Nutzungsrecht für die Vertragslaufzeit.
        </p>
      </Abschnitt>

      <Abschnitt titel="10. Haftung">
        <p>
          <Platzhalter>Haftungsregelung von einer Fachperson formulieren lassen — typischerweise unbeschränkt bei Vorsatz, grober Fahrlässigkeit, Verletzung von Leben, Körper, Gesundheit und nach dem Produkthaftungsgesetz; bei einfacher Fahrlässigkeit nur für vertragswesentliche Pflichten und der Höhe nach begrenzt</Platzhalter>
        </p>
      </Abschnitt>

      <Abschnitt titel="11. Änderungen dieser Bedingungen">
        <p>
          Bellegio darf diese Bedingungen mit Wirkung für die Zukunft ändern, wenn dies für den Kunden zumutbar ist. Änderungen werden dem Kunden mindestens
          vier Wochen vor Inkrafttreten in Textform mitgeteilt. Sie gelten als angenommen, wenn der Kunde nicht innerhalb dieser Frist widerspricht; darauf wird in
          der Mitteilung hingewiesen.
        </p>
      </Abschnitt>

      <Abschnitt titel="12. Schlussbestimmungen">
        <p>
          Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist, soweit zulässig, der Sitz von Bellegio
          (<Angabe wert={b.anschrift?.split("\n").slice(-1)[0] ?? null} name="Sitz" />). Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im Übrigen wirksam.
        </p>
      </Abschnitt>
    </RechtstextSeite>
  );
}
