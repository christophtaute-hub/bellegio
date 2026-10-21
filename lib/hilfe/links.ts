/** Reine Hilfen für die Hilfe-Seiten: Das Handbuch liegt als Markdown in docs/handbuch/ und soll sowohl auf GitHub als auch in der App
 * funktionieren. Darum stehen dort relative Dateilinks, die die App hier auf ihre Routen umschreibt. */

export const HILFE_BASIS = "/einstellungen/hilfe";

/** Anker wie auf GitHub: klein, Leerzeichen → Bindestrich, Satzzeichen weg (Umlaute bleiben). */
export function ueberschriftAnker(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

/** Link im Markdown → Link in der App. Externe Links und reine Anker bleiben, `NN-name.md#anker` wird zur Kapitelseite. */
export function hilfeLink(href: string | undefined): { href: string; extern: boolean } {
  if (!href) return { href: "#", extern: false };
  if (/^(https?:|mailto:)/i.test(href)) return { href, extern: !href.startsWith("mailto:") };
  if (href.startsWith("#")) return { href, extern: false };
  const [pfad, anker] = href.split("#");
  const datei = pfad.split("/").pop() ?? "";
  if (!datei.endsWith(".md")) return { href, extern: false };
  const slug = datei.replace(/\.md$/, "");
  const ziel = slug.toLowerCase() === "readme" ? HILFE_BASIS : `${HILFE_BASIS}/${slug}`;
  return { href: anker ? `${ziel}#${anker}` : ziel, extern: false };
}

/** Bild im Markdown (`../../public/hilfe/x.png`) → öffentliche Adresse (`/hilfe/x.png`). Andere Quellen bleiben unverändert. */
export function hilfeBild(src: string | undefined): string | undefined {
  if (!src) return src;
  const treffer = src.match(/public\/(hilfe\/[^/]+)$/);
  return treffer ? `/${treffer[1]}` : src;
}

/** Titel eines Kapitels = erste Überschrift der Datei. */
export function kapitelTitel(markdown: string, fallback: string): string {
  const zeile = markdown.split("\n").find((z) => z.startsWith("# "));
  return zeile ? zeile.replace(/^#\s+/, "").trim() : fallback;
}
