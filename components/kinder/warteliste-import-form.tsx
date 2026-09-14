"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  importWartelisteKinder,
  type WartelisteImportRow,
  type WartelisteImportResult,
} from "@/lib/actions/warteliste";

type FieldKey =
  | "vorname"
  | "nachname"
  | "geburtsdatum"
  | "gewuenschtes_eintrittsdatum"
  | "gewuenschte_betreuungsart"
  | "kontakt_telefon"
  | "kontakt_email";

const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: "vorname", label: "Vorname", required: true },
  { key: "nachname", label: "Nachname", required: true },
  { key: "geburtsdatum", label: "Geburtsdatum", required: true },
  {
    key: "gewuenschtes_eintrittsdatum",
    label: "Gewünschtes Eintrittsdatum",
    required: false,
  },
  {
    key: "gewuenschte_betreuungsart",
    label: "Gewünschte Betreuungsart",
    required: false,
  },
  { key: "kontakt_telefon", label: "Telefon", required: false },
  { key: "kontakt_email", label: "E-Mail", required: false },
];

const BETREUUNGSART_MAP: Record<string, WartelisteImportRow["gewuenschte_betreuungsart"]> = {
  krippe: "krippe",
  kindergarten: "kindergarten",
  kiga: "kindergarten",
  hort: "hort",
  altersgemischt: "altersgemischt",
};

function parseFlexibleDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function parseBetreuungsart(
  value: string | undefined
): WartelisteImportRow["gewuenschte_betreuungsart"] {
  if (!value) return null;
  return BETREUUNGSART_MAP[value.trim().toLowerCase()] ?? null;
}

export function WartelisteImportForm() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<FieldKey, number | null>>({
    vorname: null,
    nachname: null,
    geburtsdatum: null,
    gewuenschtes_eintrittsdatum: null,
    gewuenschte_betreuungsart: null,
    kontakt_telefon: null,
    kontakt_email: null,
  });
  const [quelle, setQuelle] = useState("CSV-Import");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<WartelisteImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mappedRows: WartelisteImportRow[] = useMemo(() => {
    const col = (key: FieldKey, row: string[]) => {
      const idx = mapping[key];
      return idx === null ? undefined : row[idx];
    };
    return dataRows.map((row) => ({
      vorname: col("vorname", row) ?? "",
      nachname: col("nachname", row) ?? "",
      geburtsdatum: parseFlexibleDate(col("geburtsdatum", row)) ?? "",
      gewuenschtes_eintrittsdatum: parseFlexibleDate(
        col("gewuenschtes_eintrittsdatum", row)
      ),
      gewuenschte_betreuungsart: parseBetreuungsart(
        col("gewuenschte_betreuungsart", row)
      ),
      kontakt_telefon: col("kontakt_telefon", row)?.trim() || null,
      kontakt_email: col("kontakt_email", row)?.trim() || null,
    }));
  }, [dataRows, mapping]);

  const canImport =
    dataRows.length > 0 &&
    mapping.vorname !== null &&
    mapping.nachname !== null &&
    mapping.geburtsdatum !== null;

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setFileName(file.name);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
      codepage: 65001,
    });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: false,
      dateNF: "yyyy-mm-dd",
      blankrows: false,
    });

    if (rows.length === 0) {
      setError("Die Datei enthält keine Zeilen.");
      return;
    }

    const [headerRow, ...rest] = rows;
    const cleanHeaders = headerRow.map((h) => String(h ?? "").trim());
    setHeaders(cleanHeaders);
    setDataRows(rest.map((r) => cleanHeaders.map((_, i) => String(r[i] ?? ""))));

    const autoMapping: Record<FieldKey, number | null> = {
      vorname: null,
      nachname: null,
      geburtsdatum: null,
      gewuenschtes_eintrittsdatum: null,
      gewuenschte_betreuungsart: null,
      kontakt_telefon: null,
      kontakt_email: null,
    };
    // Reihenfolge wichtig: exaktere/engere Felder zuerst, damit z. B.
    // "Nachname" nicht versehentlich die "Vorname"-Spalte belegt (die als
    // Teilstring "name" enthält).
    const guesses: Record<FieldKey, string[]> = {
      vorname: ["vorname", "first name", "firstname"],
      nachname: ["nachname", "last name", "lastname", "surname"],
      geburtsdatum: ["geburtsdatum", "geboren", "birthdate", "birthday"],
      gewuenschtes_eintrittsdatum: [
        "gewünschter eintritt",
        "wunschtermin",
        "eintritt",
        "startdatum",
      ],
      gewuenschte_betreuungsart: ["betreuungsart", "gruppenart"],
      kontakt_telefon: ["telefon", "tel", "phone"],
      kontakt_email: ["email", "e-mail", "mail"],
    };
    const lowerHeaders = cleanHeaders.map((h) => h.toLowerCase());
    const usedIndices = new Set<number>();
    for (const field of FIELDS) {
      const exactIdx = lowerHeaders.findIndex(
        (h, i) => !usedIndices.has(i) && guesses[field.key].includes(h)
      );
      const idx =
        exactIdx >= 0
          ? exactIdx
          : lowerHeaders.findIndex(
              (h, i) =>
                !usedIndices.has(i) &&
                guesses[field.key].some((g) => h.includes(g))
            );
      autoMapping[field.key] = idx >= 0 ? idx : null;
      if (idx >= 0) usedIndices.add(idx);
    }
    setMapping(autoMapping);
  }

  async function handleImport() {
    setIsImporting(true);
    setError(null);
    try {
      const res = await importWartelisteKinder(mappedRows, quelle);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import fehlgeschlagen.");
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-lg text-primary">1. Datei hochladen</h2>
        <p className="text-sm text-muted-foreground">
          CSV oder Excel-Export aus Little Bird, KitaFinder oder einer
          eigenen Liste. Erste Zeile muss die Spaltenüberschriften
          enthalten.
        </p>
        <Input
          type="file"
          accept=".csv,.xlsx,.xls"
          className="h-9 w-fit"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        {fileName ? (
          <p className="text-xs text-muted-foreground">
            Geladen: {fileName} ({dataRows.length} Zeilen)
          </p>
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor="quelle" className="text-xs text-muted-foreground">
            Quelle (wird bei jedem Kind hinterlegt)
          </label>
          <Input
            id="quelle"
            value={quelle}
            onChange={(e) => setQuelle(e.target.value)}
            className="h-8 w-64"
          />
        </div>
      </section>

      {headers.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">
            2. Spalten zuordnen
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FIELDS.map((field) => (
              <div key={field.key} className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                <select
                  className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                  value={mapping[field.key] ?? ""}
                  onChange={(e) =>
                    setMapping((prev) => ({
                      ...prev,
                      [field.key]:
                        e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                >
                  <option value="">– nicht zugeordnet –</option>
                  {headers.map((h, i) => (
                    <option key={i} value={i}>
                      {h || `Spalte ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {dataRows.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">3. Vorschau</h2>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vorname</TableHead>
                  <TableHead>Nachname</TableHead>
                  <TableHead>Geburtsdatum</TableHead>
                  <TableHead>Gewünschter Eintritt</TableHead>
                  <TableHead>Betreuungsart</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>E-Mail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mappedRows.slice(0, 10).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.vorname || "–"}</TableCell>
                    <TableCell>{row.nachname || "–"}</TableCell>
                    <TableCell
                      className={!row.geburtsdatum ? "text-destructive" : undefined}
                    >
                      {row.geburtsdatum || "fehlt/ungültig"}
                    </TableCell>
                    <TableCell>{row.gewuenschtes_eintrittsdatum ?? "–"}</TableCell>
                    <TableCell>{row.gewuenschte_betreuungsart ?? "–"}</TableCell>
                    <TableCell>{row.kontakt_telefon ?? "–"}</TableCell>
                    <TableCell>{row.kontakt_email ?? "–"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {mappedRows.length > 10 ? (
            <p className="text-xs text-muted-foreground">
              … und {mappedRows.length - 10} weitere Zeilen.
            </p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button type="button" onClick={handleImport} disabled={!canImport || isImporting}>
              {isImporting
                ? "Importiere…"
                : `${mappedRows.length} Kinder als Warteliste importieren`}
            </Button>
            {!canImport ? (
              <p className="text-xs text-destructive">
                Vorname, Nachname und Geburtsdatum müssen zugeordnet sein.
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {result ? (
        <section className="flex flex-col gap-3 rounded-xl border bg-secondary/30 p-6">
          <h2 className="font-heading text-lg text-primary">Ergebnis</h2>
          <Badge variant={result.fehler.length === 0 ? "secondary" : "destructive"}>
            {result.importiert} Kinder importiert
            {result.fehler.length > 0
              ? `, ${result.fehler.length} Zeilen übersprungen`
              : ""}
          </Badge>
          {result.fehler.length > 0 ? (
            <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
              {result.fehler.map((f, i) => (
                <li key={i}>
                  Zeile {f.zeile}: {f.grund}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
