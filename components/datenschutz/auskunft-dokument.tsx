import { DruckButton } from "@/components/shared/druck-button";
import { AuskunftExcel } from "@/components/datenschutz/auskunft-excel";
import type { AenderungsZeile } from "@/lib/datenschutz/auskunft";

export type AuskunftEintrag = {
  zeitpunkt: string;
  von: string;
  art: "Angelegt" | "Geändert";
  aenderungen: AenderungsZeile[];
};

/** Auskunft nach Art. 15 DSGVO über die zu einer Person gespeicherten Daten. Druckoptimiert (Als PDF speichern) und
 * als Excel. Die Texte sind eine Vorlage — die Vollständigkeit prüft der Verantwortliche. */
export function AuskunftDokument({
  betroffene,
  verantwortlicher,
  stand,
  felder,
  weitere,
  verlauf,
  loeschfristMonate,
}: {
  betroffene: { art: "Kind" | "Person"; name: string };
  verantwortlicher: { trager: string; einrichtung: string; anschrift: string };
  stand: string;
  felder: { label: string; wert: string }[];
  weitere?: { titel: string; zeilen: string[] };
  verlauf: AuskunftEintrag[];
  loeschfristMonate: number | null;
}) {
  const excelBlaetter = [
    { name: "Gespeicherte Daten", zeilen: [["Angabe", "Wert"], ...felder.map((f) => [f.label, f.wert || "–"])] },
    ...(weitere ? [{ name: weitere.titel.slice(0, 30), zeilen: [[weitere.titel], ...weitere.zeilen.map((z) => [z])] }] : []),
    {
      name: "Änderungsverlauf",
      zeilen: [
        ["Zeitpunkt", "Von", "Art", "Feld", "Vorher", "Nachher"],
        ...verlauf.flatMap((e) =>
          e.aenderungen.length > 0
            ? e.aenderungen.map((a) => [e.zeitpunkt, e.von, e.art, a.feld, a.vorher, a.nachher])
            : [[e.zeitpunkt, e.von, e.art, "", "", ""]]
        ),
      ],
    },
  ];

  return (
    <article className="flex max-w-3xl flex-col gap-6 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl text-primary">Auskunft nach Art. 15 DSGVO</h1>
          <p className="text-sm text-muted-foreground">
            Alle zu {betroffene.name} gespeicherten Daten — zum Ausdrucken oder als Excel für die anfragende Person.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DruckButton label="Drucken / als PDF speichern" />
          <AuskunftExcel blaetter={excelBlaetter} dateiname={`auskunft-${betroffene.name.replace(/\s+/g, "-").toLowerCase()}.xlsx`} />
        </div>
      </div>

      <header className="flex flex-col gap-1 border-b pb-3">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Auskunft nach Art. 15 DSGVO · Stand {stand}</p>
        <h2 className="font-heading text-xl text-primary print:text-black">{betroffene.name}</h2>
      </header>

      <section className="flex flex-col gap-1 text-sm">
        <h3 className="font-heading text-base text-primary print:text-black">Verantwortlicher</h3>
        <p>
          {verantwortlicher.trager} · {verantwortlicher.einrichtung}
          {verantwortlicher.anschrift ? <><br />{verantwortlicher.anschrift}</> : null}
        </p>
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h3 className="font-heading text-base text-primary print:text-black">Gespeicherte Daten</h3>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {felder.map((f) => (
            <div key={f.label} className="flex gap-2 break-inside-avoid">
              <dt className="w-40 shrink-0 text-muted-foreground">{f.label}</dt>
              <dd className="font-medium">{f.wert || "–"}</dd>
            </div>
          ))}
        </dl>
      </section>

      {weitere ? (
        <section className="flex flex-col gap-2 text-sm">
          <h3 className="font-heading text-base text-primary print:text-black">{weitere.titel}</h3>
          {weitere.zeilen.length > 0 ? (
            <ul className="flex list-disc flex-col gap-0.5 pl-5">
              {weitere.zeilen.map((z) => (
                <li key={z}>{z}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Keine Einträge.</p>
          )}
        </section>
      ) : null}

      <section className="flex flex-col gap-2 text-sm">
        <h3 className="font-heading text-base text-primary print:text-black">Änderungsverlauf</h3>
        {verlauf.length === 0 ? (
          <p className="text-muted-foreground">Es ist kein Änderungsverlauf gespeichert.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {verlauf.map((e, i) => (
              <li key={`${e.zeitpunkt}-${i}`} className="break-inside-avoid rounded-lg border p-3">
                <p className="font-medium">
                  {e.zeitpunkt} <span className="font-normal text-muted-foreground">— {e.von} ({e.art})</span>
                </p>
                {e.aenderungen.length > 0 ? (
                  <ul className="mt-1 flex flex-col gap-0.5 text-muted-foreground">
                    {e.aenderungen.map((a) => (
                      <li key={a.feld}>
                        {a.feld}: {a.vorher} → <span className="text-foreground">{a.nachher}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2 text-sm">
        <h3 className="font-heading text-base text-primary print:text-black">Zweck, Empfänger und Rechte</h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
          <li>
            <span className="text-foreground">Zweck:</span> Verwaltung der Betreuungsplätze sowie Belegungs-, Personal- und Meldeplanung der Einrichtung.
          </li>
          <li>
            <span className="text-foreground">Empfänger:</span> Mitarbeitende der Einrichtung im Rahmen ihrer Berechtigungen; Bellegio als Auftragsverarbeiter
            (Hosting, Datenbank) mit seinen Unterauftragnehmern; im Rahmen gesetzlicher Meldepflichten die zuständigen Stellen [Träger ergänzt].
          </li>
          <li>
            <span className="text-foreground">Speicherdauer:</span>{" "}
            {loeschfristMonate !== null
              ? `Der Träger prüft die Löschung ${loeschfristMonate} Monate nach dem Austritt.`
              : "Der Träger legt die Aufbewahrungsdauer fest [Träger ergänzt]."}
          </li>
          <li>
            <span className="text-foreground">Rechte:</span> Berichtigung, Löschung, Einschränkung der Verarbeitung, Widerspruch und Beschwerde bei der zuständigen
            Datenschutz-Aufsichtsbehörde.
          </li>
        </ul>
        <p className="text-xs text-muted-foreground">
          Diese Auskunft wurde aus den in Bellegio gespeicherten Daten erzeugt. Der Verantwortliche prüft vor der Herausgabe, ob weitere Daten außerhalb
          von Bellegio (Akten, Verträge) beauskunftet werden müssen.
        </p>
      </section>
    </article>
  );
}
