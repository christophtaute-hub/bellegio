import { describe, expect, it } from "vitest";
import { oderFilter, suchTokens, MAX_TOKENS } from "@/lib/suche/suchbegriff";
import { APP_FUNKTIONEN, filtereFunktionen } from "@/lib/suche/funktionen";

describe("suchTokens", () => {
  it("zerlegt mehrere Wörter", () => {
    expect(suchTokens("  Anna   Müller ")).toEqual(["Anna", "Müller"]);
  });

  it("entfernt PostgREST-Sonderzeichen und Wildcards", () => {
    expect(suchTokens("a,vorname.ilike.%")).toEqual(["avornameilike"]);
    expect(suchTokens("x),or(id.neq.0")).toEqual(["xoridneq0"]);
    expect(suchTokens("%_*\\\"(),.")).toEqual([]);
  });

  it("behält Bindestrich, Apostroph und Umlaute", () => {
    expect(suchTokens("Müller-Lüdenscheidt O'Brien")).toEqual(["Müller-Lüdenscheidt", "O'Brien"]);
  });

  it("begrenzt Anzahl und Länge", () => {
    expect(suchTokens("a b c d e f g")).toHaveLength(MAX_TOKENS);
    expect(suchTokens("x".repeat(200))[0]).toHaveLength(40);
  });

  it("leere Eingabe ergibt keine Tokens", () => {
    expect(suchTokens("   ")).toEqual([]);
  });
});

describe("oderFilter", () => {
  it("baut je Token einen ODER über die Spalten", () => {
    expect(oderFilter(["Anna", "Mül"], ["vorname", "nachname"])).toEqual([
      "vorname.ilike.%Anna%,nachname.ilike.%Anna%",
      "vorname.ilike.%Mül%,nachname.ilike.%Mül%",
    ]);
  });
});

describe("filtereFunktionen", () => {
  it("findet über Label und Schlagworte, Umlaute egal", () => {
    expect(filtereFunktionen(APP_FUNKTIONEN, ["nutzer"]).map((f) => f.href)).toContain("/einstellungen/nutzer");
    expect(filtereFunktionen(APP_FUNKTIONEN, ["prüfungsmappe"]).map((f) => f.href)).toContain("/controlling/mappe");
    expect(filtereFunktionen(APP_FUNKTIONEN, ["fördererlöse"]).map((f) => f.href)).toContain("/controlling");
  });

  it("verknüpft mehrere Wörter per UND", () => {
    const treffer = filtereFunktionen(APP_FUNKTIONEN, ["kind", "anlegen"]).map((f) => f.href);
    expect(treffer).toContain("/kinder/neu");
    expect(treffer).not.toContain("/team/neu");
  });

  it("ohne Tokens keine Treffer", () => {
    expect(filtereFunktionen(APP_FUNKTIONEN, [])).toEqual([]);
  });
});
