import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { APP_FUNKTIONEN } from "@/lib/suche/funktionen";

/** Die Regel „Abrechnung sieht nur der System-Admin (Betreiber)“ darf nicht versehentlich aufweichen. Die eigentliche Sperre liegt in der
 * Datenbank (supabase/tests/betreiber_zugriff.sql); diese Tests halten die Oberfläche und den Code an der Regel fest. */
const WURZEL = process.cwd();

function dateien(ordner: string): string[] {
  return readdirSync(ordner).flatMap((name) => {
    const voll = path.join(ordner, name);
    if (statSync(voll).isDirectory()) return dateien(voll);
    return /\.(ts|tsx)$/.test(name) ? [voll] : [];
  });
}

describe("Abrechnung nur für den System-Admin", () => {
  it("die Suche bietet die Abrechnung nur dem Betreiber an", () => {
    const eintrag = APP_FUNKTIONEN.find((f) => f.href === "/admin");
    expect(eintrag?.nurBetreiber).toBe(true);
    for (const f of APP_FUNKTIONEN.filter((f) => f.href.startsWith("/admin"))) expect(f.nurBetreiber, f.href).toBe(true);
  });

  it("das Menü zeigt den Punkt „Abrechnung“ nur, wenn der Nutzer Betreiber ist", () => {
    const layout = readFileSync(path.join(WURZEL, "app", "(app)", "layout.tsx"), "utf8");
    expect(layout).toContain('abrechnung={istBetreiber ? "/admin" : null}');
  });

  it("der Admin-Bereich liefert Nicht-Betreibern eine 404-Seite", () => {
    const layout = readFileSync(path.join(WURZEL, "app", "(admin)", "layout.tsx"), "utf8");
    expect(layout).toMatch(/isPlatformOperator\(\)/);
    expect(layout).toMatch(/notFound\(\)/);
  });

  it("außerhalb von Admin-Bereich und Admin-Aktionen liest kein Code die Rechnungs- und Betreibertabellen", () => {
    // Impressum und AGB lesen einzelne Felder (Steuernummer, Zahlungsziel) aus betreiber_einstellungen. Für Besucher liefert die Datenbank dort nichts
    // (nur Betreiber dürfen lesen) — die Felder erscheinen öffentlich nie. Bekannte Lücke, siehe Aufgabe „Impressum/AGB: Felder öffentlich lesbar machen“.
    const erlaubt = [
      path.join("lib", "admin"),
      path.join("lib", "actions", "admin.ts"),
      path.join("app", "(admin)"),
      path.join("components", "admin"),
      path.join("app", "impressum"),
      path.join("app", "agb"),
    ];
    const gesperrt = /from\(\s*["'](rechnungen|rechnungspositionen|rechnungsnummern|trager_abrechnung|betreiber_einstellungen)["']/;
    const treffer: string[] = [];
    for (const wurzel of ["app", "components", "lib"]) {
      for (const datei of dateien(path.join(WURZEL, wurzel))) {
        const relativ = path.relative(WURZEL, datei);
        if (erlaubt.some((e) => relativ.startsWith(e))) continue;
        if (gesperrt.test(readFileSync(datei, "utf8"))) treffer.push(relativ);
      }
    }
    expect(treffer).toEqual([]);
  });
});
