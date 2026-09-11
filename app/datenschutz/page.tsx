import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Zurück zur Startseite
      </Link>
      <h1 className="font-heading text-3xl tracking-tight text-primary">
        Datenschutzerklärung
      </h1>

      <p className="rounded-xl border border-dashed border-accent bg-accent/10 p-4 text-sm text-muted-foreground">
        Platzhalter – bitte mit den echten Angaben des Trägers ersetzen,
        bevor die Seite öffentlich beworben wird. Diese Erklärung ersetzt
        keine Rechtsberatung.
      </p>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          1. Verantwortliche Stelle
        </h2>
        <p>
          [Name des Trägers]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ und Ort]
          <br />
          E-Mail: [E-Mail-Adresse]
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          2. Hosting und Auftragsverarbeitung
        </h2>
        <p>
          Diese Anwendung wird bei Hostinger gehostet. Die Speicherung der
          Daten (Datenbank und Authentifizierung) erfolgt über Supabase mit
          Serverstandort Frankfurt am Main, Deutschland. Mit beiden
          Anbietern besteht bzw. wird ein Auftragsverarbeitungsvertrag
          gemäß Art. 28 DSGVO abgeschlossen.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">3. Cookies</h2>
        <p>
          Diese Anwendung verwendet ausschließlich technisch notwendige
          Cookies zur Anmeldung (Sitzungs-Cookie) und zur Speicherung der
          zuletzt gewählten Einrichtung. Diese Cookies werden auf Grundlage
          von Art. 6 Abs. 1 lit. f DSGVO gesetzt und sind für den Betrieb
          der Anwendung erforderlich. Ein Einwilligungsbanner ist daher
          nicht erforderlich.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          4. Verarbeitete Daten
        </h2>
        <p>
          Im Rahmen der Nutzung werden personenbezogene Daten von
          Mitarbeitenden und Kindern der jeweiligen Einrichtung
          verarbeitet (u. a. Name, Geburtsdatum, Geschlecht, Buchungs- und
          Beschäftigungsdaten), soweit dies für die Kita-Verwaltung und
          -Controlling erforderlich ist.
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          5. Betroffenenrechte
        </h2>
        <p>
          Betroffene Personen haben das Recht auf Auskunft, Berichtigung,
          Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit
          und Widerspruch. Anfragen richten Sie bitte an die oben genannte
          verantwortliche Stelle.
        </p>
      </section>
    </div>
  );
}
