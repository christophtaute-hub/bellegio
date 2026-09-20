"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  pruefeKinderDatei,
  pruefeTeamDatei,
  uebernehmeKinderDatei,
  uebernehmeTeamDatei,
  type UebernahmeErgebnis,
} from "@/lib/actions/import";
import { normalisiere, zeilenAusMatrix, type RohWert, type RohZeile } from "@/lib/import/hilfen";
import { KIND_SPALTEN } from "@/lib/import/kinder";
import { TEAM_SPALTEN } from "@/lib/import/team";
import type { VorlagenBlatt } from "@/lib/import/vorlagen";

type Art = "kinder" | "team";

type Zeile = {
  zeile: number;
  status: "ok" | "warnung" | "fehler" | "duplikat";
  meldungen: string[];
  anzeige: string;
};

type Ansicht = {
  fehlendeSpalten: string[];
  erkannteSpalten: { feld: string; quelle: string }[];
  zeilen: Zeile[];
  uebernehmbar: number;
  mitWarnung: number;
  fehler: number;
  duplikate: number;
};

const TEXTE: Record<Art, { einzahl: string; mehrzahl: string; ziel: string; zielLabel: string; dateiname: string }> = {
  kinder: { einzahl: "Kind", mehrzahl: "Kinder", ziel: "/kinder", zielLabel: "Zu den Kindern", dateiname: "bellegio-vorlage-kinder.xlsx" },
  team: { einzahl: "Person", mehrzahl: "Personen", ziel: "/team", zielLabel: "Zum Team", dateiname: "bellegio-vorlage-team.xlsx" },
};

const STATUS_BADGE: Record<Zeile["status"], { label: string; variant: "secondary" | "destructive" | "outline" | "default" }> = {
  ok: { label: "Bereit", variant: "secondary" },
  warnung: { label: "Mit Hinweis", variant: "outline" },
  fehler: { label: "Fehler", variant: "destructive" },
  duplikat: { label: "Vorhanden", variant: "outline" },
};

/** Liest .xlsx/.xls/.csv im Browser — die Datei verlässt den Rechner nur als geprüfte Tabellenzeilen. */
async function leseDatei(datei: File, art: Art): Promise<RohZeile[]> {
  let arbeitsmappe: XLSX.WorkBook;
  if (/\.csv$/i.test(datei.name)) {
    const text = (await datei.text()).replace(/^﻿/, "");
    const ersteZeile = text.split(/\r?\n/, 1)[0] ?? "";
    const trenner = (ersteZeile.match(/;/g)?.length ?? 0) > (ersteZeile.match(/,/g)?.length ?? 0) ? ";" : ",";
    arbeitsmappe = XLSX.read(text, { type: "string", FS: trenner, raw: true });
  } else {
    arbeitsmappe = XLSX.read(await datei.arrayBuffer(), { type: "array" });
  }

  const ziel = art === "kinder" ? "kinder" : "team";
  const blattName =
    arbeitsmappe.SheetNames.find((n) => normalisiere(n) === ziel) ??
    arbeitsmappe.SheetNames.find((n) => normalisiere(n) !== "hinweise") ??
    arbeitsmappe.SheetNames[0];
  const blatt = arbeitsmappe.Sheets[blattName];
  if (!blatt) return [];

  const matrix = XLSX.utils.sheet_to_json<RohWert[]>(blatt, { header: 1, raw: true, defval: null });
  return art === "kinder"
    ? zeilenAusMatrix(matrix, KIND_SPALTEN).zeilen
    : zeilenAusMatrix(matrix, TEAM_SPALTEN).zeilen;
}

export function ImportAssistent({ art, vorlage }: { art: Art; vorlage: VorlagenBlatt[] }) {
  const t = TEXTE[art];
  const eingabe = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<RohZeile[] | null>(null);
  const [dateiname, setDateiname] = useState<string | null>(null);
  const [ansicht, setAnsicht] = useState<Ansicht | null>(null);
  const [ergebnis, setErgebnis] = useState<Extract<UebernahmeErgebnis, { ok: true }> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [nurProbleme, setNurProbleme] = useState(true);

  function vorlageHerunterladen() {
    const mappe = XLSX.utils.book_new();
    for (const blatt of vorlage) {
      const sheet = XLSX.utils.aoa_to_sheet(blatt.zeilen);
      sheet["!cols"] = (blatt.zeilen[0] ?? []).map(() => ({ wch: 22 }));
      XLSX.utils.book_append_sheet(mappe, sheet, blatt.name);
    }
    XLSX.writeFile(mappe, t.dateiname);
  }

  async function dateiGewaehlt(datei: File) {
    setPending(true);
    setError(null);
    setAnsicht(null);
    setErgebnis(null);
    try {
      const zeilen = await leseDatei(datei, art);
      if (zeilen.length === 0) {
        setError("In der Datei wurden keine Zeilen gefunden. Prüfe, ob die Kopfzeile (Vorname, Nachname …) vorhanden ist.");
        return;
      }
      const antwort = art === "kinder" ? await pruefeKinderDatei(zeilen) : await pruefeTeamDatei(zeilen);
      if (!antwort.ok) {
        setError(antwort.error);
        return;
      }
      setRows(zeilen);
      setDateiname(datei.name);
      setAnsicht(antwort.ergebnis as Ansicht);
      setNurProbleme(antwort.ergebnis.fehler > 0 || antwort.ergebnis.mitWarnung > 0);
    } catch {
      setError("Die Datei konnte nicht gelesen werden. Bitte nutze eine .xlsx- oder .csv-Datei.");
    } finally {
      setPending(false);
      if (eingabe.current) eingabe.current.value = "";
    }
  }

  async function uebernehmen() {
    if (!rows) return;
    setPending(true);
    setError(null);
    const antwort = art === "kinder" ? await uebernehmeKinderDatei(rows) : await uebernehmeTeamDatei(rows);
    setPending(false);
    if (!antwort.ok) {
      setError(antwort.error);
      return;
    }
    setErgebnis(antwort);
    setAnsicht(null);
    setRows(null);
  }

  if (ergebnis) {
    return (
      <div className="flex max-w-2xl flex-col gap-4 rounded-2xl border bg-secondary/30 p-6">
        <h2 className="font-heading text-xl text-primary">
          {ergebnis.angelegt} {ergebnis.angelegt === 1 ? t.einzahl : t.mehrzahl} übernommen
        </h2>
        {ergebnis.uebersprungen > 0 ? (
          <p className="text-sm text-muted-foreground">
            {ergebnis.uebersprungen} Zeilen wurden nicht übernommen (Fehler oder bereits vorhanden).
          </p>
        ) : null}
        {ergebnis.fehler.map((f) => (
          <p key={f} className="text-sm text-destructive">
            {f}
          </p>
        ))}
        <div className="flex flex-wrap gap-2">
          <Link href={t.ziel} className={buttonVariants({ size: "sm" })}>
            {t.zielLabel}
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setErgebnis(null)}>
            Weitere Datei importieren
          </Button>
        </div>
      </div>
    );
  }

  const sichtbar = ansicht ? ansicht.zeilen.filter((z) => !nurProbleme || z.status !== "ok") : [];

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex max-w-3xl flex-col gap-4">
        <li className="flex flex-col gap-2 rounded-2xl border bg-secondary/30 p-5">
          <h2 className="font-heading text-base text-primary">1. Vorlage herunterladen (optional)</h2>
          <p className="text-sm text-muted-foreground">
            Die Vorlage enthält die richtigen Spalten für dein Bundesland samt Beispielen und deinen Gruppen. Eigene
            Excel-Listen funktionieren auch, solange die Überschriften erkennbar sind (z. B. „Vorname“, „Geburtsdatum“).
          </p>
          <Button variant="secondary" size="sm" className="w-fit" onClick={vorlageHerunterladen}>
            <Download className="size-3.5" />
            Excel-Vorlage laden
          </Button>
        </li>
        <li className="flex flex-col gap-2 rounded-2xl border bg-secondary/30 p-5">
          <h2 className="font-heading text-base text-primary">2. Datei hochladen und prüfen</h2>
          <p className="text-sm text-muted-foreground">
            Es wird noch nichts gespeichert — du siehst zuerst, was übernommen wird und was noch korrigiert werden muss.
          </p>
          <input
            ref={eingabe}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="sr-only"
            id="import-datei"
            onChange={(e) => {
              const datei = e.target.files?.[0];
              if (datei) void dateiGewaehlt(datei);
            }}
          />
          <Button size="sm" className="w-fit" disabled={pending} onClick={() => eingabe.current?.click()}>
            <Upload className="size-3.5" />
            {pending && !ansicht ? "Wird geprüft…" : "Datei auswählen"}
          </Button>
          {dateiname && ansicht ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileSpreadsheet className="size-3.5" />
              {dateiname}
            </p>
          ) : null}
        </li>
      </ol>

      {error ? <p className="max-w-3xl text-sm text-destructive">{error}</p> : null}

      {ansicht && ansicht.fehlendeSpalten.length > 0 ? (
        <div className="flex max-w-3xl flex-col gap-2 rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm">
          <p className="font-medium text-destructive">Pflichtspalten fehlen: {ansicht.fehlendeSpalten.join(", ")}</p>
          <p className="text-muted-foreground">
            Erkannt wurden: {ansicht.erkannteSpalten.map((s) => s.quelle).join(", ") || "keine Spalte"}. Benenne die
            Überschriften wie in der Vorlage oder nutze die Vorlage direkt.
          </p>
        </div>
      ) : null}

      {ansicht && ansicht.fehlendeSpalten.length === 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="font-heading text-lg text-primary">3. Ergebnis der Prüfung</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{ansicht.uebernehmbar} übernehmbar</Badge>
            {ansicht.mitWarnung > 0 ? <Badge variant="outline">{ansicht.mitWarnung} mit Hinweis</Badge> : null}
            {ansicht.fehler > 0 ? <Badge variant="destructive">{ansicht.fehler} mit Fehler</Badge> : null}
            {ansicht.duplikate > 0 ? <Badge variant="outline">{ansicht.duplikate} bereits vorhanden</Badge> : null}
          </div>
          {ansicht.fehler > 0 ? (
            <p className="max-w-3xl text-sm text-muted-foreground">
              Zeilen mit Fehlern werden nicht übernommen. Du kannst die übrigen jetzt übernehmen und die fehlerhaften
              danach korrigiert erneut hochladen — bereits vorhandene Einträge werden dabei übersprungen.
            </p>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={nurProbleme} onChange={(e) => setNurProbleme(e.target.checked)} />
            Nur Zeilen mit Hinweis, Fehler oder Dublette zeigen
          </label>

          {sichtbar.length > 0 ? (
            <div className="max-h-[28rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Zeile</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-28">Status</TableHead>
                    <TableHead>Hinweise</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sichtbar.slice(0, 300).map((z) => (
                    <TableRow key={z.zeile}>
                      <TableCell className="tabular-nums">{z.zeile}</TableCell>
                      <TableCell>{z.anzeige}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[z.status].variant}>{STATUS_BADGE[z.status].label}</Badge>
                      </TableCell>
                      <TableCell className="whitespace-normal text-sm text-muted-foreground">
                        {z.meldungen.join(" ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Auffälligkeiten — alle Zeilen sind bereit.</p>
          )}
          {sichtbar.length > 300 ? (
            <p className="text-xs text-muted-foreground">Es werden die ersten 300 Zeilen angezeigt.</p>
          ) : null}

          <div className="flex items-center gap-3">
            <Button disabled={pending || ansicht.uebernehmbar === 0} onClick={uebernehmen}>
              {pending
                ? "Wird übernommen…"
                : `${ansicht.uebernehmbar} ${ansicht.uebernehmbar === 1 ? t.einzahl : t.mehrzahl} übernehmen`}
            </Button>
            <Button variant="ghost" onClick={() => setAnsicht(null)} disabled={pending}>
              Verwerfen
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
