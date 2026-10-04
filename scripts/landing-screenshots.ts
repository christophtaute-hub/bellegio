/**
 * Nimmt echte Screenshots aus dem Demo-Zugang auf und legt sie in public/images/landing/ ab.
 *
 * Anmeldung: Es wird KEIN Passwort getippt und keines im Repo gehalten. Das Skript holt sich per Service-Role-Key (aus
 * .env.local, wie die anderen Skripte) einen einmaligen Magic-Link-Token für das Demo-Konto, tauscht ihn über den normalen
 * Auth-Weg gegen eine Sitzung ein und übergibt die Sitzungs-Cookies an Chrome. Das Demo-Passwort bleibt unberührt.
 *
 * Nutzt das lokal installierte Google Chrome über puppeteer-core (kein eigener Chromium-Download).
 *
 * Voraussetzung: `npm run dev` läuft auf Port 3000, die Demo wurde frisch abgeleitet (scripts/demo-einrichten.ts).
 * Nutzung: npx tsx --env-file=.env.local scripts/landing-screenshots.ts
 */
import puppeteer, { type ElementHandle } from "puppeteer-core";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = "http://localhost:3000";
const DEMO_EMAIL = "demo@bellegio.de";
const DEMO_TRAEGER = "Bellegio Demo";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = join(process.cwd(), "public", "images", "landing");

/** Welche Demo-Kita für welche Aufnahme: Bayern für die Bayern-spezifischen Seiten, NRW für Übersicht und Finanzen (positives
 * Ergebnis ohne manuellen Förderbetrag). */
const BAYERN = "Testkita Bayern";
const NRW = "Kita Löwenzahn";

async function sitzungsCookies(): Promise<{ name: string; value: string }[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) throw new Error("NEXT_PUBLIC_SUPABASE_URL, _ANON_KEY und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein (--env-file=.env.local).");

  const admin = createClient(url, service);
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  if (error || !data.properties?.hashed_token) throw new Error(`Magic-Link: ${error?.message ?? "kein Token"}`);

  const jar = new Map<string, string>();
  const ssr = createServerClient(url, anon, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error: verifyError } = await ssr.auth.verifyOtp({ type: "magiclink", token_hash: data.properties.hashed_token });
  if (verifyError) throw new Error(`Sitzung: ${verifyError.message}`);
  return [...jar].map(([name, value]) => ({ name, value }));
}

async function einrichtungIds(): Promise<Map<string, string>> {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: traeger } = await admin.from("trager").select("id").eq("name", DEMO_TRAEGER).single();
  if (!traeger) throw new Error(`Träger ${DEMO_TRAEGER} nicht gefunden.`);
  const { data } = await admin.from("einrichtungen").select("id, name").eq("trager_id", traeger.id);
  return new Map((data ?? []).map((e) => [e.name, e.id]));
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const ids = await einrichtungIds();
  const cookies = await sitzungsCookies();

  const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  await page.setCookie(...cookies.map((c) => ({ ...c, domain: "localhost", path: "/" })));

  const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function waehle(name: string) {
    const id = ids.get(name);
    if (!id) throw new Error(`Einrichtung ${name} nicht gefunden.`);
    await page.goto(`${BASE_URL}/einrichtung-auswahl/oeffnen?id=${id}`, { waitUntil: "networkidle0", timeout: 60000 });
  }

  /** Für Werbebilder: Next.js-Entwickleranzeige und den Demo-Hinweis ausblenden. */
  async function bereinige() {
    await page.addStyleTag({ content: "nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }" });
    await page.evaluate(() => {
      for (const p of Array.from(document.querySelectorAll("p"))) {
        if (p.textContent?.startsWith("Demo-Zugang.")) p.remove();
      }
    });
  }

  /** Streaming-Seiten (Dashboard-Forecast ~4 s) brauchen etwas länger, bis Diagramme fertig gerendert sind. */
  async function oeffne(pfad: string, warteAuf?: string) {
    await page.goto(`${BASE_URL}${pfad}`, { waitUntil: "networkidle0", timeout: 60000 });
    if (warteAuf) await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 60000 }, warteAuf);
    await bereinige();
    await pause(1800);
  }

  async function elementFuer(text: string, selektor = "h1, h2, h3"): Promise<ElementHandle<Element> | null> {
    const handle = await page.evaluateHandle(
      (t, sel) => {
        const heading = Array.from(document.querySelectorAll(sel)).find((h) => h.textContent?.includes(t));
        return heading?.closest("section") ?? heading?.parentElement?.parentElement ?? heading ?? null;
      },
      text,
      selektor
    );
    return handle.asElement() as ElementHandle<Element> | null;
  }

  const nur = process.argv[2]; // optional: nur Aufnahmen, deren Dateiname dieses Wort enthält
  async function sichern(dateiname: string, aufnahme: () => Promise<void>) {
    if (nur && !dateiname.includes(nur)) return;
    console.log(`→ ${dateiname}`);
    try {
      await aufnahme();
      console.log(`  ✓ ${dateiname}`);
    } catch (fehler) {
      console.warn(`  ✗ ${dateiname} übersprungen: ${(fehler as Error).message}`);
    }
  }
  const ziel = (dateiname: string) => join(OUT_DIR, dateiname) as `${string}.png`;

  /** Für Elementaufnahmen: den mitlaufenden Seitenkopf ausblenden, sonst verdeckt er den Ausschnitt. */
  async function ohneKopf() {
    await page.addStyleTag({ content: "header { visibility: hidden !important; }" });
  }

  async function abschnitt(dateiname: string, ueberschrift: string) {
    const el = await elementFuer(ueberschrift);
    if (!el) throw new Error(`Abschnitt "${ueberschrift}" nicht gefunden`);
    await ohneKopf();
    // Karten in einem Raster werden auf Zeilenhöhe gestreckt — auf Inhaltshöhe zurücksetzen, sonst bleibt unten Leerraum.
    await el.evaluate((e) => ((e as HTMLElement).style.alignSelf = "start"));
    await el.scrollIntoView();
    await pause(400);
    await el.screenshot({ path: ziel(dateiname) });
  }

  /** Obere `hoehe` Pixel eines Elements (für sehr lange Tabellen). */
  async function elementOben(dateiname: string, selektor: string, hoehe: number) {
    const el = await page.$(selektor);
    if (!el) throw new Error(`Element ${selektor} nicht gefunden`);
    await ohneKopf();
    await el.evaluate((e, h) => {
      const node = e as HTMLElement;
      node.style.maxHeight = `${h}px`;
      node.style.overflowY = "hidden";
    }, hoehe);
    await el.scrollIntoView();
    await pause(400);
    await el.screenshot({ path: ziel(dateiname) });
  }

  // --- Löwenzahn (NRW): Dashboard, Übersicht, Suche, Finanzen ---
  await waehle(NRW);
  await sichern("dashboard.png", async () => {
    await oeffne("/dashboard", "Personal-Ausblick");
    await page.screenshot({ path: ziel("dashboard.png") });
  });
  await sichern("finanzen-uebersicht.png", async () => {
    await oeffne("/dashboard?modus=finanzen", "Fördererlöse");
    await abschnitt("finanzen-uebersicht.png", "Übersicht");
  });
  await sichern("szenario-finanzen.png", async () => {
    await oeffne("/szenario", "Personalkosten (simuliert)");
    await abschnitt("szenario-finanzen.png", "Finanzen");
  });
  await sichern("suche.png", async () => {
    await oeffne("/dashboard", "Personal-Ausblick");
    await page.keyboard.down("Meta");
    await page.keyboard.press("k");
    await page.keyboard.up("Meta");
    await page.waitForSelector('[data-slot="dialog-content"]', { timeout: 10000 });
    await page.keyboard.type("mia", { delay: 60 });
    await page.waitForFunction(() => document.querySelector('[data-slot="dialog-content"]')?.textContent?.includes("Mia"), { timeout: 15000 });
    await pause(500);
    const dialog = await page.$('[data-slot="dialog-content"]');
    const box = await dialog?.boundingBox();
    if (!box) throw new Error("Suchdialog nicht sichtbar");
    await page.screenshot({
      path: ziel("suche.png"),
      clip: { x: Math.max(box.x - 40, 0), y: Math.max(box.y - 40, 0), width: box.width + 80, height: box.height + 80 },
    });
    await page.keyboard.press("Escape");
  });
  await sichern("einrichtungen.png", async () => {
    await page.setViewport({ width: 1440, height: 1150, deviceScaleFactor: 2 });
    await oeffne("/einrichtung-auswahl", "Meine Einrichtungen");
    await page.waitForFunction(() => document.body.innerText.includes("Anstellungsschlüssel"), { timeout: 60000 });
    await pause(800);
    await page.screenshot({ path: ziel("einrichtungen.png"), clip: { x: 170, y: 40, width: 920, height: 930 } });
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
  });

  // --- Testkita Bayern: Team, Ausblick, Vorschau, Controlling, Kind ---
  await waehle(BAYERN);
  await sichern("personal-ausblick.png", async () => {
    await oeffne("/dashboard", "Personal-Ausblick");
    await abschnitt("personal-ausblick.png", "Personal-Ausblick");
  });
  await sichern("team.png", async () => {
    await oeffne("/team", "Anstellungsschlüssel");
    await page.screenshot({ path: ziel("team.png") });
  });
  await sichern("belegungs-vorschau.png", async () => {
    await oeffne("/gruppen/vorschau", "Belegungs");
    await page.screenshot({ path: ziel("belegungs-vorschau.png") });
  });
  await sichern("controlling.png", async () => {
    await oeffne("/controlling", "KINDER (KOPFZAHL)");
    await elementOben("controlling.png", ".overflow-x-auto.rounded-lg.border", 980);
  });
  await sichern("kategorisierung.png", async () => {
    await oeffne("/controlling", "Kategorisierung nach Kalenderjahr");
    await abschnitt("kategorisierung.png", "Kategorisierung nach Kalenderjahr");
  });
  await sichern("pruefungsmappe.png", async () => {
    await oeffne("/controlling/mappe", "Prüfungsmappe");
    await page.screenshot({ path: ziel("pruefungsmappe.png") });
  });
  await sichern("kind-profil.png", async () => {
    await oeffne("/kinder", "Kinder");
    const href = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/kinder/"]'));
      return links.map((a) => a.getAttribute("href") ?? "").find((h) => /^\/kinder\/[0-9a-f-]{36}$/.test(h)) ?? null;
    });
    if (!href) throw new Error("kein Kind gefunden");
    await oeffne(href, "Änderungshistorie");
    await page.screenshot({ path: ziel("kind-profil.png") });
  });

  await browser.close();
  console.log(`\nFertig — Bilder liegen in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

