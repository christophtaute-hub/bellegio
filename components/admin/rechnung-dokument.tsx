import { formatDate } from "@/lib/kita-datum";
import { formatEuro } from "@/lib/admin/abrechnung";

export type RechnungAbsender = {
  firmenname?: string | null;
  anschrift?: string | null;
  ust_id?: string | null;
  steuernummer?: string | null;
  iban?: string | null;
  bic?: string | null;
  bankname?: string | null;
  ust_hinweis?: string | null;
  fusszeile?: string | null;
  zahlungsziel_tage?: number | null;
};

export type RechnungEmpfaenger = {
  name?: string | null;
  anschrift?: string | null;
  ust_id?: string | null;
  email?: string | null;
};

export type RechnungDokumentDaten = {
  nummer: string | null;
  status: string;
  rechnungsdatum: string | null;
  faellig_am: string | null;
  leistungszeitraum_von: string;
  leistungszeitraum_bis: string;
  summe_netto: number;
  ust_satz: number;
  summe_ust: number;
  summe_brutto: number;
  notiz: string | null;
  storno_von_nummer: string | null;
};

export type RechnungPositionAnzeige = {
  beschreibung: string;
  menge: number;
  einheit: string;
  einzelpreis_netto: number;
  summe_netto: number | null;
};

function Zeilen({ text }: { text: string | null | undefined }) {
  return (
    <>
      {(text ?? "").split("\n").map((zeile, i) => (
        <span key={i} className="block">
          {zeile}
        </span>
      ))}
    </>
  );
}

/** Druckoptimierte A4-Rechnung; bleibt bewusst hell (auch im Dark Mode). */
export function RechnungDokument({
  rechnung,
  positionen,
  absender,
  empfaenger,
}: {
  rechnung: RechnungDokumentDaten;
  positionen: RechnungPositionAnzeige[];
  absender: RechnungAbsender;
  empfaenger: RechnungEmpfaenger;
}) {
  const istEntwurf = rechnung.status === "entwurf";
  const istGutschrift = rechnung.storno_von_nummer !== null || rechnung.summe_netto < 0;

  return (
    <article className="relative mx-auto w-full max-w-[210mm] rounded-xl border bg-white p-8 text-sm leading-relaxed text-neutral-900 shadow-sm md:p-12 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      {istEntwurf ? (
        <p className="absolute top-4 right-6 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
          Entwurf — nicht gültig
        </p>
      ) : null}

      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="text-xs leading-snug text-neutral-500">
            <p className="mb-1 underline underline-offset-2">
              {absender.firmenname || "Absender fehlt"}
              {absender.anschrift ? ` · ${absender.anschrift.split("\n").join(", ")}` : ""}
            </p>
            <div className="mt-4 text-sm text-neutral-900">
              <p className="font-medium">{empfaenger.name || "Empfänger fehlt"}</p>
              <Zeilen text={empfaenger.anschrift} />
            </div>
          </div>
          <div className="text-right text-xs leading-snug text-neutral-600">
            <p className="text-sm font-semibold text-neutral-900">{absender.firmenname}</p>
            <Zeilen text={absender.anschrift} />
            {absender.ust_id ? <p className="mt-1">USt-IdNr.: {absender.ust_id}</p> : null}
            {absender.steuernummer ? <p>Steuernummer: {absender.steuernummer}</p> : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold">
            {istGutschrift ? "Gutschrift" : "Rechnung"} {rechnung.nummer ? `Nr. ${rechnung.nummer}` : ""}
          </h1>
          {rechnung.storno_von_nummer ? (
            <p className="text-neutral-600">Storno zu Rechnung Nr. {rechnung.storno_von_nummer}</p>
          ) : null}
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-neutral-700 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-500">Rechnungsdatum</dt>
              <dd>{formatDate(rechnung.rechnungsdatum)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Leistungszeitraum</dt>
              <dd>
                {formatDate(rechnung.leistungszeitraum_von)} – {formatDate(rechnung.leistungszeitraum_bis)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Fällig am</dt>
              <dd>{formatDate(rechnung.faellig_am)}</dd>
            </div>
          </dl>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-neutral-300 text-left text-xs text-neutral-500">
              <th className="py-2 pr-2 font-medium">Pos.</th>
              <th className="py-2 pr-2 font-medium">Beschreibung</th>
              <th className="py-2 pr-2 text-right font-medium">Menge</th>
              <th className="py-2 pr-2 text-right font-medium">Einzelpreis</th>
              <th className="py-2 text-right font-medium">Netto</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p, i) => (
              <tr key={i} className="border-b border-neutral-100 align-top break-inside-avoid">
                <td className="py-2 pr-2 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-2">{p.beschreibung}</td>
                <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">
                  {p.menge.toLocaleString("de-DE")} {p.einheit}
                </td>
                <td className="py-2 pr-2 text-right whitespace-nowrap tabular-nums">{formatEuro(p.einzelpreis_netto)}</td>
                <td className="py-2 text-right whitespace-nowrap tabular-nums">
                  {formatEuro(p.summe_netto ?? Math.round(p.menge * p.einzelpreis_netto * 100) / 100)}
                </td>
              </tr>
            ))}
            {positionen.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center text-neutral-400">
                  Noch keine Positionen.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="ml-auto flex w-full max-w-xs flex-col gap-1 break-inside-avoid">
          <div className="flex justify-between">
            <span className="text-neutral-600">Summe netto</span>
            <span className="tabular-nums">{formatEuro(rechnung.summe_netto)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-neutral-600">
              Umsatzsteuer {rechnung.ust_satz.toLocaleString("de-DE")} %
            </span>
            <span className="tabular-nums">{formatEuro(rechnung.summe_ust)}</span>
          </div>
          <div className="mt-1 flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold">
            <span>Gesamtbetrag</span>
            <span className="tabular-nums">{formatEuro(rechnung.summe_brutto)}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-neutral-700 break-inside-avoid">
          {absender.ust_hinweis ? <p>{absender.ust_hinweis}</p> : null}
          {rechnung.notiz ? <p>{rechnung.notiz}</p> : null}
          {absender.iban ? (
            <p>
              Bitte überweisen Sie den Betrag
              {absender.zahlungsziel_tage !== null && absender.zahlungsziel_tage !== undefined
                ? ` innerhalb von ${absender.zahlungsziel_tage} Tagen`
                : ""}{" "}
              auf: {absender.bankname ? `${absender.bankname}, ` : ""}IBAN {absender.iban}
              {absender.bic ? `, BIC ${absender.bic}` : ""}.
            </p>
          ) : null}
        </div>

        {absender.fusszeile ? (
          <p className="border-t pt-3 text-xs text-neutral-500">
            <Zeilen text={absender.fusszeile} />
          </p>
        ) : null}
      </div>
    </article>
  );
}
