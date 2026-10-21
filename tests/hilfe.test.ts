import { describe, expect, it } from "vitest";
import { hilfeBild, hilfeLink, kapitelTitel, ueberschriftAnker } from "@/lib/hilfe/links";

describe("Hilfe: Links und Anker", () => {
  it("Anker wie auf GitHub, Umlaute bleiben", () => {
    expect(ueberschriftAnker("Die Buchungszeit ändern")).toBe("die-buchungszeit-ändern");
    expect(ueberschriftAnker("Plus oder Minus? (nur mit Recht „Finanzübersicht“)")).toBe("plus-oder-minus-nur-mit-recht-finanzübersicht");
    expect(ueberschriftAnker("Nutzer und Rechte")).toBe("nutzer-und-rechte");
  });

  it("Dateilinks werden zu App-Routen, externe Links bleiben", () => {
    expect(hilfeLink("06-einstellungen.md#datenschutz")).toEqual({ href: "/einstellungen/hilfe/06-einstellungen#datenschutz", extern: false });
    expect(hilfeLink("../x/07-glossar.md")).toEqual({ href: "/einstellungen/hilfe/07-glossar", extern: false });
    expect(hilfeLink("README.md")).toEqual({ href: "/einstellungen/hilfe", extern: false });
    expect(hilfeLink("https://example.org")).toEqual({ href: "https://example.org", extern: true });
    expect(hilfeLink("mailto:a@b.de").extern).toBe(false);
    expect(hilfeLink("#abschnitt")).toEqual({ href: "#abschnitt", extern: false });
  });

  it("Bilder aus public/hilfe bekommen die öffentliche Adresse", () => {
    expect(hilfeBild("../../public/hilfe/dashboard.png")).toBe("/hilfe/dashboard.png");
    expect(hilfeBild("https://example.org/x.png")).toBe("https://example.org/x.png");
  });

  it("Kapitel-Titel ist die erste Überschrift", () => {
    expect(kapitelTitel("text\n# 3 — Team\n## Unterpunkt", "fallback")).toBe("3 — Team");
    expect(kapitelTitel("ohne Überschrift", "fallback")).toBe("fallback");
  });
});
