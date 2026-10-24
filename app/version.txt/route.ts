import { formatBuildStand, leseBuildStand } from "@/lib/build-stand";

/** Öffentlich und ohne Daten: zeigt nur, welcher Stand der App läuft. Prüfbar mit `curl https://bellegio.de/version.txt`. */
export function GET() {
  return new Response(`Bellegio ${formatBuildStand(leseBuildStand())}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
