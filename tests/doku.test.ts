import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ueberschriftAnker } from "@/lib/hilfe/links";

const WURZEL = process.cwd();
const DOCS = path.join(WURZEL, "docs");

function alleMarkdown(ordner: string): string[] {
  return readdirSync(ordner).flatMap((name) => {
    const voll = path.join(ordner, name);
    return statSync(voll).isDirectory() ? alleMarkdown(voll) : voll.endsWith(".md") ? [voll] : [];
  });
}

function anker(markdown: string): Set<string> {
  return new Set(
    markdown
      .split("\n")
      .filter((z) => /^#{1,6}\s/.test(z))
      .map((z) => ueberschriftAnker(z.replace(/^#+\s+/, "").replace(/[*`]/g, "")))
  );
}

/** Links der Form [text](ziel) ohne Codeblöcke. */
function links(markdown: string): { ziel: string }[] {
  const ohneCode = markdown.replace(/```[\s\S]*?```/g, "");
  return [...ohneCode.matchAll(/!?\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => ({ ziel: m[1] }));
}

describe("Dokumentation", () => {
  const dateien = alleMarkdown(DOCS);

  it("alle relativen Links und Bilder zeigen auf vorhandene Dateien und Anker", () => {
    const fehler: string[] = [];
    for (const datei of dateien) {
      const text = readFileSync(datei, "utf8");
      for (const { ziel } of links(text)) {
        if (/^(https?:|mailto:)/.test(ziel)) continue;
        const [pfad, a] = ziel.split("#");
        const zielDatei = pfad ? path.resolve(path.dirname(datei), pfad) : datei;
        if (!existsSync(zielDatei)) {
          fehler.push(`${path.relative(WURZEL, datei)}: ${ziel} (Datei fehlt)`);
          continue;
        }
        if (a && zielDatei.endsWith(".md") && !anker(readFileSync(zielDatei, "utf8")).has(a)) {
          fehler.push(`${path.relative(WURZEL, datei)}: ${ziel} (Anker fehlt)`);
        }
      }
    }
    expect(fehler).toEqual([]);
  });

  it("jede Entscheidung steht im Index", () => {
    const index = readFileSync(path.join(DOCS, "entscheidungen", "README.md"), "utf8");
    const entscheidungen = readdirSync(path.join(DOCS, "entscheidungen")).filter((d) => /^\d{4}-.*\.md$/.test(d));
    expect(entscheidungen.length).toBeGreaterThan(0);
    for (const d of entscheidungen) expect(index, d).toContain(`(${d})`);
  });

  it("jedes Handbuch-Kapitel ist in der Handbuch-Startseite verlinkt", () => {
    const start = readFileSync(path.join(DOCS, "handbuch", "README.md"), "utf8");
    const kapitel = readdirSync(path.join(DOCS, "handbuch")).filter((d) => /^\d{2}-.*\.md$/.test(d));
    expect(kapitel.length).toBeGreaterThan(0);
    for (const k of kapitel) expect(start, k).toContain(`(${k}`);
  });

  it("jede Handbuch-Abbildung existiert in public/hilfe", () => {
    for (const datei of dateien.filter((d) => d.includes(`${path.sep}handbuch${path.sep}`))) {
      for (const { ziel } of links(readFileSync(datei, "utf8"))) {
        const m = ziel.match(/public\/(hilfe\/[^/]+)$/);
        if (m) expect(existsSync(path.join(WURZEL, "public", m[1])), ziel).toBe(true);
      }
    }
  });
});

/** Routen der Kunden-App müssen in funktionen.md vorkommen, damit neue Seiten nicht undokumentiert bleiben. */
describe("Funktionsübersicht", () => {
  function seiten(ordner: string, praefix = ""): string[] {
    return readdirSync(ordner).flatMap((name) => {
      const voll = path.join(ordner, name);
      if (statSync(voll).isDirectory()) {
        const segment = /^\(.*\)$/.test(name) ? "" : `/${name}`;
        return seiten(voll, praefix + segment);
      }
      return name === "page.tsx" ? [praefix || "/"] : [];
    });
  }

  it("jede Seite der Kunden-App steht in funktionen.md", () => {
    const funktionen = readFileSync(path.join(DOCS, "funktionen.md"), "utf8");
    const normal = (route: string) => route.replace(/\[[^\]]+\]/g, "[id]");
    const routen = [...seiten(path.join(WURZEL, "app", "(app)")), ...seiten(path.join(WURZEL, "app", "(onboarding)"))].map(normal);
    const ausnahmen = ["/zustimmung", "/dokumentation"]; // Zustimmung und Altlink sind dort beschrieben bzw. umgeleitet
    const fehlend = routen.filter((r) => !ausnahmen.includes(r) && !funktionen.includes(`\`${r}\``) && !funktionen.includes(`\`${r.replace(/\/\[id\]/g, "/[id]")}`));
    expect(fehlend).toEqual([]);
  });
});
