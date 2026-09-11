import Link from "next/link";

export default function ImpressumPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-16">
      <Link href="/" className="text-sm text-primary hover:underline">
        ← Zurück zur Startseite
      </Link>
      <h1 className="font-heading text-3xl tracking-tight text-primary">Impressum</h1>

      <p className="rounded-xl border border-dashed border-accent bg-accent/10 p-4 text-sm text-muted-foreground">
        Platzhalter – bitte mit den echten Angaben des Trägers ersetzen,
        bevor die Seite öffentlich beworben wird.
      </p>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          Angaben gemäß § 5 TMG
        </h2>
        <p>
          [Name des Trägers]
          <br />
          [Straße und Hausnummer]
          <br />
          [PLZ und Ort]
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          Vertreten durch
        </h2>
        <p>[Name der vertretungsberechtigten Person(en)]</p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">Kontakt</h2>
        <p>
          Telefon: [Telefonnummer]
          <br />
          E-Mail: [E-Mail-Adresse]
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h2 className="font-heading text-lg text-primary">
          Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV
        </h2>
        <p>[Name, Anschrift wie oben]</p>
      </section>
    </div>
  );
}
