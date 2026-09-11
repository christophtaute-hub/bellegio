/**
 * Importiert Kinder, Gruppen und Personal aus der real genutzten
 * Personalbelegungsliste (Excel) einer Einrichtung nach Supabase.
 *
 * WICHTIG: liest personenbezogene Daten (Namen, Geburtsdaten) aus einer
 * lokalen Datei. Diese Datei wird NIE ins Repo committet (siehe .gitignore).
 * Die Konsolenausgabe dieses Skripts gibt bewusst nur Zahlen/Warnungen aus,
 * keine Klarnamen — auch nicht bei --apply.
 *
 * Nutzung:
 *   npm run import:excel -- --file=/pfad/zur/datei.xlsx
 *   npm run import:excel -- --file=/pfad/zur/datei.xlsx --apply --confirm-einrichtung="Villa Kunterbunt"
 *
 * Ohne --apply wird NICHTS geschrieben (Trockenlauf).
 */

import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/database.types";

const EINRICHTUNG_NAME = "Villa Kunterbunt";
const EINRICHTUNG_CITY = "München";
const TRAGER_NAME = "Villa Kunterbunt";

const GRUPPEN_SHEETS = [
  "KiGa Pinguine",
  "KiGa Robben",
  "KiKri Igel",
  "KiKri Marienkäfer",
  "KiKri Mäuse",
];

const STATUS_TO_WEIGHTING_CODE: Record<string, string> = {
  "3-s": "ue3_bis_schuleintritt",
  s: "schulkinder",
  m: "nicht_deutschsprachig",
  "0-3": "u3",
  i: "integrationskinder",
};

const ANRECHNUNG_TO_ROLE_CATEGORY: Record<string, string> = {
  fk: "fk",
  ek: "ek",
  ak: "ak",
  "nicht-päd.": "nicht_paed",
  "nicht-paed.": "nicht_paed",
  "nicht päd.": "nicht_paed",
  nichtpäd: "nicht_paed",
  sprachförderung: "sprachfoerderung",
  sprachfoerderung: "sprachfoerderung",
  hausmeister: "hausmeister",
  hauswirtschaftskraft: "hauswirtschaft",
};

const GERMAN_MONTHS = [
  "januar",
  "februar",
  "märz",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "dezember",
];

const EINSCHULUNG_MAP: Record<string, string> = {
  muss: "muss",
  kann: "kann",
  korridor: "korridor",
};

type Cell = string | number | Date | null | undefined;
type SheetGrid = Cell[][];

type Warning = string;

type ImportSummary = {
  gruppenFoundOrCreated: number;
  kinderInserted: number;
  kinderUpdated: number;
  kinderSkipped: number;
  teamInserted: number;
  teamUpdated: number;
  monthlyHoursWritten: number;
  warnings: Warning[];
};

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const prefix = `--${name}=`;
    const found = args.find((a) => a.startsWith(prefix));
    return found?.slice(prefix.length);
  };
  return {
    file: get("file") ?? process.env.EXCEL_PATH,
    apply: args.includes("--apply"),
    confirmEinrichtung: get("confirm-einrichtung"),
  };
}

function colLetterToIndex(letters: string): number {
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}
const COL = (letters: string) => colLetterToIndex(letters);

function cellText(v: Cell): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function cellDateIso(v: Cell): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  return null;
}

function normalize(v: Cell): string {
  return cellText(v).toLowerCase().trim();
}

function extractDateFromBemerkung(
  text: string,
  keyword: "Eintritt" | "Austritt"
): string | null {
  const re = new RegExp(`${keyword}[^0-9]{0,5}(\\d{2})\\.(\\d{2})\\.(\\d{4})`, "i");
  const m = text.match(re);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

async function main() {
  const { file, apply, confirmEinrichtung } = parseArgs();

  if (!file) {
    console.error(
      "Bitte --file=/pfad/zur/datei.xlsx angeben (oder EXCEL_PATH setzen)."
    );
    process.exit(1);
  }
  if (apply && confirmEinrichtung !== EINRICHTUNG_NAME) {
    console.error(
      `Zum Schreiben bitte --confirm-einrichtung="${EINRICHTUNG_NAME}" exakt angeben.`
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (z.B. in .env.local)."
    );
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  console.log(`Modus: ${apply ? "APPLY (schreibt in die Datenbank)" : "TROCKENLAUF (keine Schreibvorgänge)"}`);
  console.log(`Ziel-Einrichtung: "${EINRICHTUNG_NAME}"`);

  const workbook = XLSX.readFile(file, { cellDates: true });
  const summary: ImportSummary = {
    gruppenFoundOrCreated: 0,
    kinderInserted: 0,
    kinderUpdated: 0,
    kinderSkipped: 0,
    teamInserted: 0,
    teamUpdated: 0,
    monthlyHoursWritten: 0,
    warnings: [],
  };

  // --- Referenzdaten laden ---
  const { data: weightingFactors } = await supabase
    .from("weighting_factors")
    .select("id, code");
  const weightingByCode = new Map(
    (weightingFactors ?? []).map((w) => [w.code, w.id])
  );

  const { data: bookingBands } = await supabase
    .from("booking_time_bands")
    .select("id, label");
  const bandByLabel = new Map((bookingBands ?? []).map((b) => [b.label, b.id]));

  // --- 1. Träger + Einrichtung (find-or-create) ---
  let einrichtungId: string;
  {
    const { data: existing } = await supabase
      .from("einrichtungen")
      .select("id, trager_id")
      .eq("name", EINRICHTUNG_NAME)
      .maybeSingle();

    if (existing) {
      einrichtungId = existing.id;
      console.log(`Einrichtung existiert bereits (${einrichtungId}).`);
    } else if (!apply) {
      einrichtungId = "00000000-0000-0000-0000-000000000000";
      console.log("[Trockenlauf] Einrichtung würde neu angelegt.");
    } else {
      const { data: trager, error: tragerError } = await supabase
        .from("trager")
        .insert({ name: TRAGER_NAME })
        .select("id")
        .single();
      if (tragerError || !trager) {
        throw new Error(`Träger konnte nicht angelegt werden: ${tragerError?.message}`);
      }
      const { data: neueEinrichtung, error: einrichtungError } = await supabase
        .from("einrichtungen")
        .insert({
          name: EINRICHTUNG_NAME,
          trager_id: trager.id,
          address_city: EINRICHTUNG_CITY,
        })
        .select("id")
        .single();
      if (einrichtungError || !neueEinrichtung) {
        throw new Error(
          `Einrichtung konnte nicht angelegt werden: ${einrichtungError?.message}`
        );
      }
      einrichtungId = neueEinrichtung.id;
      console.log(`Einrichtung neu angelegt (${einrichtungId}).`);
    }
  }

  // --- 2. Gruppen ---
  const gruppeIdBySheet = new Map<string, string>();
  for (const sheetName of GRUPPEN_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      summary.warnings.push(`Blatt "${sheetName}" nicht in der Excel gefunden — übersprungen.`);
      continue;
    }
    const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, {
      header: 1,
      raw: true,
    }) as unknown as SheetGrid;

    const gruppenartRaw = normalize(grid[0]?.[COL("C")]);
    const gruppenart =
      gruppenartRaw === "krippe" || gruppenartRaw === "kikri"
        ? "krippe"
        : "kindergarten";
    const sollplatzeRaw = grid[1]?.[COL("C")];
    const sollplatze = Number(sollplatzeRaw) || 0;

    if (!apply) {
      summary.gruppenFoundOrCreated += 1;
      gruppeIdBySheet.set(sheetName, "dry-run");
      continue;
    }

    const { data: existingGruppe } = await supabase
      .from("gruppen")
      .select("id")
      .eq("einrichtung_id", einrichtungId)
      .eq("name", sheetName)
      .maybeSingle();

    if (existingGruppe) {
      gruppeIdBySheet.set(sheetName, existingGruppe.id);
    } else {
      const { data: neueGruppe, error } = await supabase
        .from("gruppen")
        .insert({
          einrichtung_id: einrichtungId,
          name: sheetName,
          gruppenart,
          sollplatze,
        })
        .select("id")
        .single();
      if (error || !neueGruppe) {
        summary.warnings.push(`Gruppe "${sheetName}" konnte nicht angelegt werden: ${error?.message}`);
        continue;
      }
      gruppeIdBySheet.set(sheetName, neueGruppe.id);
    }
    summary.gruppenFoundOrCreated += 1;
  }

  // --- 3. Kinder ---
  type RosterBlock = { cols: Record<string, string>; rowStart: number; rowEnd: number; requiresBv: boolean };
  const BLOCK1: RosterBlock = {
    rowStart: 5,
    rowEnd: 34,
    requiresBv: false,
    cols: {
      name: "B",
      geschlecht: "C",
      geburtsdatum: "D",
      eintritt: "F",
      austritt: "G",
      status: "H",
      zeitk: "I",
      einschulung: "J",
      betrieb: "L",
    },
  };
  const BLOCK2: RosterBlock = {
    rowStart: 5,
    rowEnd: 34,
    requiresBv: true,
    cols: {
      name: "P",
      geschlecht: "Q",
      geburtsdatum: "R",
      eintritt: "T",
      austritt: "U",
      status: "V",
      zeitk: "W",
      betrieb: "Y",
      bv: "Z",
    },
  };
  const BLOCK3: RosterBlock = {
    rowStart: 39,
    rowEnd: 53,
    requiresBv: false,
    cols: {
      name: "B",
      geschlecht: "C",
      geburtsdatum: "D",
      eintritt: "F",
      austritt: "G",
      status: "H",
      zeitk: "I",
      einschulung: "J",
      betrieb: "L",
    },
  };

  for (const sheetName of GRUPPEN_SHEETS) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const grid = XLSX.utils.sheet_to_json<Cell[]>(sheet, {
      header: 1,
      raw: true,
    }) as unknown as SheetGrid;
    const gruppeId = gruppeIdBySheet.get(sheetName);

    for (const block of [BLOCK1, BLOCK2, BLOCK3]) {
      for (let r = block.rowStart; r <= block.rowEnd; r++) {
        const row = grid[r];
        if (!row) continue;
        const nameRaw = cellText(row[COL(block.cols.name)]);
        if (!nameRaw) continue;

        if (block.requiresBv) {
          const bv = normalize(row[COL(block.cols.bv!)]);
          if (bv !== "ja") continue;
        }

        const nameParts = nameRaw.split(/\s+/);
        const nachname = nameParts.pop() ?? nameRaw;
        const vorname = nameParts.join(" ") || nameRaw;

        const geburtsdatumIso = cellDateIso(row[COL(block.cols.geburtsdatum)]);
        if (!geburtsdatumIso) {
          summary.kinderSkipped += 1;
          summary.warnings.push(
            `${sheetName}: Kind ohne erkennbares Geburtsdatum übersprungen.`
          );
          continue;
        }

        const geschlechtRaw = normalize(row[COL(block.cols.geschlecht)]);
        const geschlecht =
          geschlechtRaw === "m"
            ? "maennlich"
            : geschlechtRaw === "w"
              ? "weiblich"
              : "keine_angabe";

        const eintritt = cellDateIso(row[COL(block.cols.eintritt)]);
        const austritt = cellDateIso(row[COL(block.cols.austritt)]);

        const statusRaw = normalize(row[COL(block.cols.status)]);
        const weightingCode = STATUS_TO_WEIGHTING_CODE[statusRaw];
        if (!weightingCode) {
          summary.warnings.push(
            `${sheetName}: unbekannter Status-Code "${statusRaw}" — kein Gewichtungsfaktor gesetzt.`
          );
        }
        const weightingFactorId = weightingCode
          ? weightingByCode.get(weightingCode)
          : undefined;

        const zeitkRaw = cellText(row[COL(block.cols.zeitk)]);
        let bandId = bandByLabel.get(zeitkRaw);
        if (!bandId && zeitkRaw) {
          const lowerBound = Number(zeitkRaw.split("-")[0]);
          if (lowerBound >= 9) bandId = bandByLabel.get("über 9h");
        }
        if (!bandId && zeitkRaw) {
          summary.warnings.push(
            `${sheetName}: unbekannte Buchungszeit "${zeitkRaw}" — keine Buchungszeit gesetzt.`
          );
        }

        const einschulungRaw = block.cols.einschulung
          ? normalize(row[COL(block.cols.einschulung)])
          : "";
        const einschulungsstatus = EINSCHULUNG_MAP[einschulungRaw] ?? null;

        const betriebszugehoerigkeit = block.cols.betrieb
          ? cellText(row[COL(block.cols.betrieb)]) || null
          : null;

        if (!apply) {
          summary.kinderInserted += 1;
          continue;
        }

        const { data: existingKind } = await supabase
          .from("kinder")
          .select("id")
          .eq("einrichtung_id", einrichtungId)
          .eq("vorname", vorname)
          .eq("nachname", nachname)
          .eq("geburtsdatum", geburtsdatumIso)
          .maybeSingle();

        const payload = {
          einrichtung_id: einrichtungId,
          gruppe_id: gruppeId && gruppeId !== "dry-run" ? gruppeId : null,
          vorname,
          nachname,
          geburtsdatum: geburtsdatumIso,
          geschlecht,
          status: "aktiv" as const,
          eintritt,
          austritt,
          buchungszeit_band_id: bandId ?? null,
          einschulungsstatus,
          betriebszugehoerigkeit,
        };

        let kindId: string | undefined;
        if (existingKind) {
          const { error } = await supabase
            .from("kinder")
            .update(payload)
            .eq("id", existingKind.id);
          if (error) {
            summary.warnings.push(`${sheetName}: Kind konnte nicht aktualisiert werden: ${error.message}`);
            continue;
          }
          kindId = existingKind.id;
          summary.kinderUpdated += 1;
        } else {
          const { data: neuesKind, error } = await supabase
            .from("kinder")
            .insert(payload)
            .select("id")
            .single();
          if (error || !neuesKind) {
            summary.warnings.push(`${sheetName}: Kind konnte nicht angelegt werden: ${error?.message}`);
            continue;
          }
          kindId = neuesKind.id;
          summary.kinderInserted += 1;
        }

        if (kindId && weightingFactorId) {
          await supabase
            .from("kind_weighting_factors")
            .delete()
            .eq("kind_id", kindId);
          await supabase
            .from("kind_weighting_factors")
            .insert({ kind_id: kindId, weighting_factor_id: weightingFactorId });
        }
      }
    }
  }

  // --- 4. Team ---
  const personalSheet = workbook.Sheets["Personal"];
  if (!personalSheet) {
    summary.warnings.push('Blatt "Personal" nicht gefunden — kein Personal importiert.');
  } else {
    const grid = XLSX.utils.sheet_to_json<Cell[]>(personalSheet, {
      header: 1,
      raw: true,
    }) as unknown as SheetGrid;

    // Referenzjahr aus Forecast!B1, falls vorhanden, sonst aktuelles Jahr
    let startYear = new Date().getFullYear();
    const forecastSheet = workbook.Sheets["Forecast"];
    if (forecastSheet) {
      const forecastGrid = XLSX.utils.sheet_to_json<Cell[]>(forecastSheet, {
        header: 1,
        raw: true,
      }) as unknown as SheetGrid;
      const yearCell = forecastGrid[0]?.[COL("B")];
      if (typeof yearCell === "number") startYear = yearCell;
    }

    // Monatsspalten dynamisch aus der Kopfzeile (Zeile 3, Index 2) lesen
    const headerRow = grid[2] ?? [];
    const monthColumns: { col: number; year: number; month: number }[] = [];
    let cursorMonth = -1;
    let cursorYear = startYear;
    for (let c = COL("F"); c < headerRow.length; c++) {
      const label = normalize(headerRow[c]).replace(/\d+$/, "");
      const monthIndex = GERMAN_MONTHS.indexOf(label);
      if (monthIndex === -1) continue;
      if (cursorMonth === -1) {
        cursorMonth = monthIndex;
      } else {
        cursorMonth += 1;
        if (cursorMonth > 11) {
          cursorMonth = 0;
          cursorYear += 1;
        }
      }
      monthColumns.push({ col: c, year: cursorYear, month: cursorMonth });
    }

    for (let r = 6; r < grid.length; r++) {
      const row = grid[r];
      if (!row) continue;
      const nachname = cellText(row[COL("A")]);
      if (!nachname) continue;
      const vorname = cellText(row[COL("B")]);
      const rolle = cellText(row[COL("C")]) || null;
      const gruppenname = cellText(row[COL("D")]);
      const anrechnungRaw = normalize(row[COL("E")]);
      const roleCategory = ANRECHNUNG_TO_ROLE_CATEGORY[anrechnungRaw];
      if (!roleCategory) {
        summary.warnings.push(
          `Personal: unbekannte Anrechnung "${anrechnungRaw}" — Zeile übersprungen.`
        );
        continue;
      }
      const bemerkungen = cellText(row[COL("T")]);
      const eintritt = extractDateFromBemerkung(bemerkungen, "Eintritt");
      const austritt = extractDateFromBemerkung(bemerkungen, "Austritt");

      const gruppeId = gruppenname ? gruppeIdBySheet.get(gruppenname) : undefined;

      const currentMonthEntry = monthColumns.find(
        (m) =>
          m.year === new Date().getFullYear() &&
          m.month === new Date().getMonth()
      );
      const currentWochenstunden = currentMonthEntry
        ? Number(row[currentMonthEntry.col]) || null
        : null;

      if (!apply) {
        summary.teamInserted += 1;
        continue;
      }

      const { data: existingMitglied } = await supabase
        .from("team")
        .select("id")
        .eq("einrichtung_id", einrichtungId)
        .eq("vorname", vorname)
        .eq("nachname", nachname)
        .maybeSingle();

      const payload = {
        einrichtung_id: einrichtungId,
        vorname,
        nachname,
        rolle,
        gruppe_id: gruppeId && gruppeId !== "dry-run" ? gruppeId : null,
        role_category: roleCategory,
        fachkraft: roleCategory === "fk",
        wochenstunden: currentWochenstunden,
        status: "aktiv" as const,
        eintritt,
        austritt,
      };

      let teamId: string | undefined;
      if (existingMitglied) {
        const { error } = await supabase
          .from("team")
          .update(payload)
          .eq("id", existingMitglied.id);
        if (error) {
          summary.warnings.push(`Personal: konnte nicht aktualisiert werden: ${error.message}`);
          continue;
        }
        teamId = existingMitglied.id;
        summary.teamUpdated += 1;
      } else {
        const { data: neuesMitglied, error } = await supabase
          .from("team")
          .insert(payload)
          .select("id")
          .single();
        if (error || !neuesMitglied) {
          summary.warnings.push(`Personal: konnte nicht angelegt werden: ${error?.message}`);
          continue;
        }
        teamId = neuesMitglied.id;
        summary.teamInserted += 1;
      }

      if (teamId) {
        for (const { col, year, month } of monthColumns) {
          const wert = Number(row[col]);
          if (!Number.isFinite(wert)) continue;
          const monthDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
          const { error } = await supabase.from("team_monthly_hours").upsert(
            { team_id: teamId, month: monthDate, wochenstunden: wert },
            { onConflict: "team_id,month" }
          );
          if (!error) summary.monthlyHoursWritten += 1;
        }
      }
    }
  }

  console.log("\n--- Zusammenfassung ---");
  console.log(`Gruppen gefunden/angelegt: ${summary.gruppenFoundOrCreated}`);
  console.log(`Kinder neu: ${summary.kinderInserted}, aktualisiert: ${summary.kinderUpdated}, übersprungen: ${summary.kinderSkipped}`);
  console.log(`Personal neu: ${summary.teamInserted}, aktualisiert: ${summary.teamUpdated}`);
  console.log(`Monatsstunden-Einträge geschrieben: ${summary.monthlyHoursWritten}`);
  if (summary.warnings.length > 0) {
    console.log(`\n--- Warnungen (${summary.warnings.length}) ---`);
    for (const w of summary.warnings) console.log(`- ${w}`);
  }
  if (!apply) {
    console.log(
      "\nTrockenlauf abgeschlossen — nichts wurde geschrieben. Mit --apply --confirm-einrichtung=\"Villa Kunterbunt\" ausführen, um zu schreiben."
    );
  }
}

main().catch((err) => {
  console.error("Import fehlgeschlagen:", err instanceof Error ? err.message : err);
  process.exit(1);
});
