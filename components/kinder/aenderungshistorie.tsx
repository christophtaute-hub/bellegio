"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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

function RawDataRow({ eintrag }: { eintrag: AenderungsEintrag }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <li className="rounded-lg border p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>
          <span className="font-medium">
            {formatTimestamp(eintrag.changed_at)}
          </span>{" "}
          <span className="text-muted-foreground">
            — {eintrag.changed_by_name ?? "Unbekannt"}
            {eintrag.old_data ? " (Änderung)" : " (Angelegt)"}
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "Details ausblenden" : "Details anzeigen"}
        </Button>
      </div>
      {expanded ? (
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {eintrag.old_data ? (
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Vorher
              </p>
              <pre className="overflow-x-auto rounded bg-secondary/50 p-2 text-xs">
                {JSON.stringify(eintrag.old_data, null, 2)}
              </pre>
            </div>
          ) : null}
          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">
              Nachher
            </p>
            <pre className="overflow-x-auto rounded bg-secondary/50 p-2 text-xs">
              {JSON.stringify(eintrag.new_data, null, 2)}
            </pre>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function Aenderungshistorie({
  eintraege,
}: {
  eintraege: AenderungsEintrag[];
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
          <RawDataRow key={eintrag.id} eintrag={eintrag} />
        ))}
      </ul>
    </div>
  );
}
