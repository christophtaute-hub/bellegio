import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ANGABEN_STAND, ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { Abschnitt, Angabe, Platzhalter, RechtstextSeite } from "@/components/legal/bausteine";

export default async function DatenschutzPage() {
  const b = await ladeBetreiberOeffentlich(await createClient());
  const kontakt = b.datenschutz_email || b.email;

  return (
    <RechtstextSeite titel="Datenschutzerklärung" stand={ANGABEN_STAND} entwurf={!b.rechtstexte_geprueft}>
      <Abschnitt titel="1. Verantwortlicher">
        <p>
          <Angabe wert={b.firmenname} name="Firmenname" />
          <br />
          <span className="whitespace-pre-line">
            <Angabe wert={b.anschrift} name="Anschrift" />
          </span>
          <br />
          E-Mail: <Angabe wert={kontakt} name="E-Mail-Adresse" />
        </p>
        <p>
          Diese Erklärung gilt für die Website und für die Datenverarbeitung, die Bellegio für eigene Zwecke vornimmt (Website, Kundenkonten, Abrechnung). Für
          die Kita-Daten, die Träger in der Anwendung erfassen (Kinder, Personal), ist der jeweilige Träger verantwortlich; Bellegio verarbeitet sie als
          Auftragsverarbeiter nach Art. 28 DSGVO auf Grundlage des <Link href="/avv" className="text-primary underline">Auftragsverarbeitungsvertrags</Link>.
        </p>
      </Abschnitt>

      <Abschnitt titel="2. Hosting und Auftragsverarbeiter">
        <p>
          Datenbank und Anmeldung laufen bei Supabase in einem Rechenzentrum in Frankfurt am Main. Für die Auslieferung der Website und für den
          E-Mail-Versand setzen wir Dienstleister ein, die in der{" "}
          <Link href="/unterauftragnehmer" className="text-primary underline">Liste der Unterauftragnehmer</Link> aufgeführt sind. Mit allen Dienstleistern
          besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO bzw. wird vor dem Einsatz abgeschlossen.
        </p>
      </Abschnitt>

      <Abschnitt titel="3. Server-Protokolle">
        <p>
          Beim Aufruf der Website verarbeitet der Hosting-Dienstleister technisch notwendige Verbindungsdaten (u. a. IP-Adresse, Zeitpunkt, aufgerufene Adresse,
          Browser). Das dient der Sicherheit und dem stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO). Die Speicherdauer richtet sich nach dem eingesetzten
          Dienstleister <Platzhalter>Speicherdauer der Server-Protokolle nach Wahl des Hosters eintragen</Platzhalter>.
        </p>
      </Abschnitt>

      <Abschnitt titel="4. Cookies">
        <p>
          Wir setzen ausschließlich technisch notwendige Cookies: ein Anmelde-Cookie und ein Cookie, das die zuletzt gewählte Einrichtung merkt. Rechtsgrundlage
          ist Art. 6 Abs. 1 lit. f DSGVO bzw. § 25 Abs. 2 Nr. 2 TDDDG. Wir verwenden keine Werbe- oder Analyse-Cookies und binden keine Dienste Dritter (etwa
          Schriftarten-Server oder Karten) von außen ein; ein Einwilligungsbanner ist deshalb nicht erforderlich.
        </p>
      </Abschnitt>

      <Abschnitt titel="5. Kundenkonto und Anmeldung">
        <p>
          Für Nutzerkonten verarbeiten wir Name, E-Mail-Adresse, Rolle und Berechtigungen sowie technische Anmeldedaten (Passwort als Prüfwert, optional den
          zweiten Faktor). Zweck ist die Bereitstellung der Anwendung (Art. 6 Abs. 1 lit. b DSGVO). Konten werden gelöscht, wenn der Vertrag endet.
        </p>
      </Abschnitt>

      <Abschnitt titel="6. Abrechnung">
        <p>
          Für Rechnungen verarbeiten wir Firmen- und Kontaktdaten der Kunden, Rechnungspositionen und Zahlungsstatus. Rechtsgrundlage sind Art. 6 Abs. 1 lit. b und
          lit. c DSGVO. Wir bewahren Rechnungen entsprechend den handels- und steuerrechtlichen Aufbewahrungsfristen auf.
        </p>
      </Abschnitt>

      <Abschnitt titel="7. Kontaktformular (Demo-Anfrage)">
        <p>
          Über das Formular auf der Startseite können Sie eine Demo anfragen. Wir speichern Ihren Namen, Ihre Einrichtung bzw. Ihren Träger, das Bundesland, Ihre
          E-Mail-Adresse und Ihre optionale Nachricht, um Ihre Anfrage zu beantworten (Art. 6 Abs. 1 lit. b bzw. lit. f DSGVO). Wir geben die Angaben nicht an
          Dritte weiter. Anfragen löschen wir spätestens {b.aufbewahrung_anfragen_monate} Monate nach Abschluss der Kommunikation, sofern keine Geschäftsbeziehung
          entsteht.
        </p>
      </Abschnitt>

      <Abschnitt titel="8. Ihre Rechte">
        <p>
          Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch (Art. 15–21 DSGVO)
          sowie das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Zuständig ist{" "}
          <Angabe wert={b.aufsichtsbehoerde} name="Zuständige Aufsichtsbehörde" />. Anfragen richten Sie bitte an die oben genannte Adresse. Wenn Ihre Daten in einer
          Kita-Anwendung verarbeitet werden, wenden Sie sich zunächst an den Träger der Einrichtung.
        </p>
      </Abschnitt>
    </RechtstextSeite>
  );
}
