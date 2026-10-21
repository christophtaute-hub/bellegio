import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { kapitelTitel } from "@/lib/hilfe/links";

export type Kapitel = { slug: string; titel: string; markdown: string };

const ORDNER = path.join(process.cwd(), "docs", "handbuch");

/** Liest die Handbuch-Kapitel aus docs/handbuch/ (eine Quelle für GitHub und App). README ist die Startseite, nicht ein Kapitel.
 * Die Reihenfolge ist der Dateiname (00-…, 01-…). */
export async function ladeKapitel(): Promise<Kapitel[]> {
  let dateien: string[] = [];
  try {
    dateien = (await readdir(ORDNER)).filter((d) => d.endsWith(".md") && d.toLowerCase() !== "readme.md").sort();
  } catch {
    return [];
  }
  return Promise.all(
    dateien.map(async (datei) => {
      const markdown = await readFile(path.join(ORDNER, datei), "utf8");
      const slug = datei.replace(/\.md$/, "");
      return { slug, titel: kapitelTitel(markdown, slug), markdown };
    })
  );
}

export async function ladeStartseite(): Promise<string | null> {
  try {
    return await readFile(path.join(ORDNER, "README.md"), "utf8");
  } catch {
    return null;
  }
}
