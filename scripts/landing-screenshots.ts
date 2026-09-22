/**
 * Nimmt echte Screenshots aus dem Demo-Zugang auf und legt sie in public/images/landing/ ab — ersetzt die
 * handgebauten Mockup-Komponenten der Landingpage durch echte, aktuelle Bildschirmfotos (Milestone 27,
 * Nachtrag "Landingpage-Screenshots").
 *
 * Nutzt das lokal installierte Google Chrome über puppeteer-core (kein eigener Chromium-Download) und meldet
 * sich ganz normal über das Login-Formular mit dem Demo-Konto an — keine Session-Cookies o.ä. werden
 * konstruiert.
 *
 * Voraussetzung: `npm run dev` läuft bereits auf Port 3000, das Demo-Passwort ist unten aktuell.
 * Nutzung: npx tsx scripts/landing-screenshots.ts
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = "http://localhost:3000";
const DEMO_EMAIL = "demo@bellegio.de";
const DEMO_PASSWORT = "ZybFbs7AefApue";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT_DIR = join(process.cwd(), "public", "images", "landing");

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

  console.log("Login …");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle0" });
  await page.waitForSelector("#email");
  await page.type("#email", DEMO_EMAIL);
  await page.type("#password", DEMO_PASSWORT);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle0" }),
    page.click('button[type="submit"]'),
  ]);

  async function waehleTestkitaBayern() {
    console.log("Wähle Testkita Bayern …");
    await page.goto(`${BASE_URL}/einrichtung-auswahl`, { waitUntil: "networkidle0" });
    await page.waitForSelector("form");
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle0" }),
      page.evaluate(() => {
        const form = Array.from(document.querySelectorAll("form")).find((f) =>
          f.textContent?.includes("Testkita Bayern")
        );
        (form as HTMLFormElement | undefined)?.requestSubmit();
      }),
    ]);
    console.log("  Cookies:", (await page.cookies()).map((c) => c.name).join(", "));
  }

  if (page.url().includes("einrichtung-auswahl")) {
    await waehleTestkitaBayern();
  }

  /** Manche Server Actions/Redirects verlieren die gewählte Einrichtung zwischenzeitlich (z.B. nach einem
   * Session-Refresh) — einmal automatisch neu wählen und die Navigation wiederholen, statt eine falsche
   * Seite ("Deine Einrichtungen") zu fotografieren. */
  async function stelleSicherEinrichtungGewaehlt(pfad: string): Promise<boolean> {
    if (page.url().includes("einrichtung-auswahl")) {
      await waehleTestkitaBayern();
      await page.goto(`${BASE_URL}${pfad}`, { waitUntil: "networkidle0", timeout: 20000 });
      return !page.url().includes("einrichtung-auswahl");
    }
    return true;
  }

  /** Next.js zeigt bei einem transienten Fehler (z.B. Race während einer Dev-Server-Neukompilierung) kurz die
   * Fehlerseite — ein einmaliges Neuladen behebt das meistens. */
  async function erholeVonFehlerseite() {
    const istFehler = await page.evaluate(() => document.body.innerText.includes("Da ist etwas schiefgelaufen"));
    if (istFehler) {
      console.log("  (Fehlerseite erkannt, lade neu …)");
      await new Promise((r) => setTimeout(r, 1000));
      await page.reload({ waitUntil: "networkidle0", timeout: 20000 });
    }
  }

  async function schiesse(pfad: string, dateiname: string) {
    console.log(`Screenshot: ${pfad} → ${dateiname}`);
    try {
      await page.goto(`${BASE_URL}${pfad}`, { waitUntil: "networkidle0", timeout: 20000 });
      await stelleSicherEinrichtungGewaehlt(pfad);
      await erholeVonFehlerseite();
      await new Promise((r) => setTimeout(r, 700)); // Charts/Animationen kurz ausrendern lassen
      await page.screenshot({ path: join(OUT_DIR, dateiname) as `${string}.png`, fullPage: false });
      console.log(`  ✓ ${dateiname}`);
    } catch (error) {
      console.warn(`  ✗ ${dateiname} übersprungen: ${(error as Error).message}`);
    }
  }

  /** Screenshot eines einzelnen Abschnitts (Überschriftstext gesucht, dessen umschließende <section>/<div>
   * fotografiert) statt des ganzen Viewports — für kompaktere Ausschnitte. */
  async function schiesseAbschnitt(pfad: string, ueberschrift: string, dateiname: string) {
    console.log(`Screenshot Abschnitt "${ueberschrift}": ${pfad} → ${dateiname}`);
    try {
      await page.goto(`${BASE_URL}${pfad}`, { waitUntil: "networkidle0", timeout: 20000 });
      await stelleSicherEinrichtungGewaehlt(pfad);
      await erholeVonFehlerseite();
      await new Promise((r) => setTimeout(r, 700));
      const handle = await page.evaluateHandle((text) => {
        const headings = Array.from(document.querySelectorAll("h1, h2, h3"));
        const heading = headings.find((h) => h.textContent?.includes(text));
        // Zwei Ebenen nach oben für einen sinnvollen Kartenausschnitt statt nur der Überschriftzeile.
        return heading?.closest("section") ?? heading?.parentElement?.parentElement ?? heading;
      }, ueberschrift);
      const el = handle.asElement() as import("puppeteer-core").ElementHandle<Element> | null;
      if (el) {
        await el.scrollIntoView();
        await new Promise((r) => setTimeout(r, 300));
        await el.screenshot({ path: join(OUT_DIR, dateiname) as `${string}.png` });
        console.log(`  ✓ ${dateiname}`);
      } else {
        const vorhandeneUeberschriften = await page.evaluate(() =>
          Array.from(document.querySelectorAll("h1, h2, h3")).map((h) => h.textContent?.trim())
        );
        console.warn(`  ✗ Abschnitt "${ueberschrift}" nicht gefunden. Vorhandene Überschriften: ${JSON.stringify(vorhandeneUeberschriften)}`);
      }
    } catch (error) {
      console.warn(`  ✗ ${dateiname} übersprungen: ${(error as Error).message}`);
    }
  }

  await schiesse("/dashboard", "dashboard.png");
  await schiesseAbschnitt("/dashboard", "Personal-Ausblick", "personal-ausblick.png");
  await schiesse("/team", "team.png");
  await schiesse("/gruppen/vorschau", "belegungs-vorschau.png");
  await schiesseAbschnitt("/controlling", "Kategorisierung nach Kalenderjahr", "kategorisierung.png");
  await schiesse("/controlling/mappe", "pruefungsmappe.png");

  // Kind-Profil: ein Kind aus der aktiven Einrichtung suchen (erste Zeile der Kinder-Liste).
  await page.goto(`${BASE_URL}/kinder`, { waitUntil: "networkidle0", timeout: 20000 });
  await stelleSicherEinrichtungGewaehlt("/kinder");
  const kindLink = await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/kinder/"]'));
    const echtesKind = links.find((a) => /^\/kinder\/[0-9a-f-]{36}$/.test(a.getAttribute("href") ?? ""));
    return echtesKind?.getAttribute("href") ?? null;
  });
  if (kindLink) {
    await schiesse(kindLink, "kind-profil.png");
  } else {
    console.warn("Kein Kind gefunden, kind-profil.png übersprungen.");
  }

  await browser.close();
  console.log(`\nFertig — Bilder liegen in ${OUT_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
