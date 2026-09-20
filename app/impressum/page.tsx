import { createClient } from "@/lib/supabase/server";
import { ladeBetreiberOeffentlich } from "@/lib/rechtstexte/betreiber";
import { Abschnitt, Angabe, RechtstextSeite } from "@/components/legal/bausteine";

export default async function ImpressumPage() {
  const b = await ladeBetreiberOeffentlich(await createClient());
  const hatRegister = Boolean(b.registergericht || b.registernummer);

  return (
    <RechtstextSeite titel="Impressum" entwurf={!b.rechtstexte_geprueft}>
      <Abschnitt titel="Angaben gemäß § 5 DDG">
        <p>
          <Angabe wert={b.firmenname} name="Firmenname" />
          <br />
          <span className="whitespace-pre-line">
            <Angabe wert={b.anschrift} name="Anschrift" />
          </span>
        </p>
      </Abschnitt>

      {b.vertretungsberechtigt ? (
        <Abschnitt titel="Vertreten durch">
          <p>{b.vertretungsberechtigt}</p>
        </Abschnitt>
      ) : null}

      <Abschnitt titel="Kontakt">
        <p>
          E-Mail: <Angabe wert={b.email} name="E-Mail-Adresse" />
          {b.telefon ? (
            <>
              <br />
              Telefon: {b.telefon}
            </>
          ) : null}
        </p>
      </Abschnitt>

      {hatRegister ? (
        <Abschnitt titel="Registereintrag">
          <p>
            {b.registergericht ? <>Registergericht: {b.registergericht}<br /></> : null}
            {b.registernummer ? <>Registernummer: {b.registernummer}</> : null}
          </p>
        </Abschnitt>
      ) : null}

      {b.ust_id ? (
        <Abschnitt titel="Umsatzsteuer-Identifikationsnummer">
          <p>Umsatzsteuer-Identifikationsnummer gemäß § 27a Umsatzsteuergesetz: {b.ust_id}</p>
        </Abschnitt>
      ) : null}

      {b.inhaltlich_verantwortlich ? (
        <Abschnitt titel="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
          <p className="whitespace-pre-line">{b.inhaltlich_verantwortlich}</p>
        </Abschnitt>
      ) : null}
    </RechtstextSeite>
  );
}
