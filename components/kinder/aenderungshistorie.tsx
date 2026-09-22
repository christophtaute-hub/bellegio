import { berechneAenderungen } from "@/lib/datenschutz/auskunft";

export type AenderungsEintrag = {
  id: string;
  changed_at: string;
  changed_by_name: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown>;
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AenderungsZeile({
  eintrag,
  felder,
  aufloesen,
}: {
  eintrag: AenderungsEintrag;
  felder: Record<string, string>;
  aufloesen?: (feld: string, wert: unknown) => string | null;
}) {
  const aenderungen = berechneAenderungen(eintrag.old_data, eintrag.new_data, felder, aufloesen);
  return (
    <li className="rounded-lg border p-3 text-sm break-inside-avoid">
      <p>
        <span className="font-medium">{formatTimestamp(eintrag.changed_at)}</span>{" "}
        <span className="text-muted-foreground">
          — {eintrag.changed_by_name ?? "Unbekannt"}
          {eintrag.old_data ? " (Änderung)" : " (Angelegt)"}
        </span>
      </p>
      {aenderungen.length > 0 ? (
        <ul className="mt-1.5 flex flex-col gap-0.5 text-muted-foreground">
          {aenderungen.map((a) => (
            <li key={a.feld}>
              {a.feld}
              {eintrag.old_data ? (
                <>
                  : {a.vorher} → <span className="text-foreground">{a.nachher}</span>
                </>
              ) : (
                <>: {a.nachher}</>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Änderungsverlauf mit lesbaren Feldnamen statt rohem JSON — Kennungen wie Gruppe oder Buchungszeit werden über
 * `aufloesen` in ihre Bezeichnung übersetzt (dieselbe Übersetzung wie die Auskunft nach Art. 15 DSGVO). */
export function Aenderungshistorie({
  eintraege,
  felder,
  aufloesen,
}: {
  eintraege: AenderungsEintrag[];
  felder: Record<string, string>;
  aufloesen?: (feld: string, wert: unknown) => string | null;
}) {
  if (eintraege.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Noch keine Änderungshistorie vorhanden.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="font-heading text-lg text-primary">Änderungshistorie</h2>
      <ul className="flex flex-col gap-2">
        {eintraege.map((eintrag) => (
          <AenderungsZeile key={eintrag.id} eintrag={eintrag} felder={felder} aufloesen={aufloesen} />
        ))}
      </ul>
    </div>
  );
}
